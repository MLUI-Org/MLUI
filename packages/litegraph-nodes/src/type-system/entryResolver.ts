import type { RuntimePort, RuntimeType } from "./runtimeTypes";
import { formatRuntimeType, isRuntimeTypeAssignable, parseRuntimeTypeExpression } from "./runtimeTypes";

type FunctionParameter = {
  name: string;
  annotation?: RuntimeType;
  defaultValue?: string;
};

export type EntryKind = "function" | "class" | "class-method";

export type RuntimeParameter =
  | {
      kind: "input";
      name: string;
    }
  | {
      kind: "global-input";
      name: string;
      sourceName: string;
    };

export interface RuntimeGlobalReference {
  name: string;
  sourceName: string;
  annotation?: RuntimeType;
  type?: RuntimeType;
}

export interface EntryDefinition {
  kind: EntryKind;
  functionName: string;
  className?: string;
  parameters: RuntimeParameter[];
  fields: RuntimePort[];
  inputs: RuntimePort[];
  outputs: RuntimePort[];
  globalInputs: RuntimeGlobalReference[];
  globalOutputs: RuntimePort[];
}

type EntryDecoratorSpec = {
  fields: RuntimePort[];
  inputs: RuntimePort[];
  outputs: RuntimePort[];
  globalInputs: RuntimeGlobalReference[];
  globalOutputs: RuntimePort[];
};

export type EntryResolution =
  | {
      ok: true;
      definition: EntryDefinition;
    }
  | {
      ok: false;
      error: string;
    };

export function resolveEntryDefinition(
  code: string,
  options: { kind?: EntryKind } = {},
): EntryResolution {
  if (countEntryDecorators(code) > 1) {
    return {
      ok: false,
      error: "Only one function in a node can use @entry(...).",
    };
  }

  const decoratorContent = extractEntryDecoratorContent(code);
  if (!decoratorContent) {
    return {
      ok: false,
      error: "No @entry(...) decorator was found.",
    };
  }

  const entryTarget = extractEntryTarget(code, decoratorContent.endIndex);
  if (!entryTarget) {
    return {
      ok: false,
      error: "No function or class definition was found after @entry(...).",
    };
  }

  const decoratorSpec = parseEntryDecoratorArguments(decoratorContent.value);
  if (decoratorSpec.ok === false) {
    return {
      ok: false,
      error: decoratorSpec.error,
    };
  }

  if (entryTarget.kind === "class") {
    const resolvedDecoratorSpec = attachClassFieldDefaults(
      decoratorSpec.value,
      entryTarget.initializerParameters,
    );
    if (resolvedDecoratorSpec.ok === false) {
      return resolvedDecoratorSpec;
    }

    const validation = validateClassShape({
      className: entryTarget.className,
      decoratorSpec: resolvedDecoratorSpec.value,
      initializerParameters: entryTarget.initializerParameters,
    });
    if (validation.ok === false) return validation;

    return {
      ok: true,
      definition: {
        kind: "class",
        functionName: entryTarget.className,
        className: entryTarget.className,
        parameters: [],
        fields: resolvedDecoratorSpec.value.fields,
        inputs: resolvedDecoratorSpec.value.inputs,
        outputs: resolvedDecoratorSpec.value.outputs,
        globalInputs: resolvedDecoratorSpec.value.globalInputs,
        globalOutputs: resolvedDecoratorSpec.value.globalOutputs,
      },
    };
  }

  const resolvedDecoratorSpec: EntryDecoratorSpec = {
    ...decoratorSpec.value,
    globalOutputs: attachGlobalOutputDefaults(
      decoratorSpec.value.globalOutputs,
      entryTarget.returnExpression,
    ),
  };

  const parameters = parseFunctionParameters(entryTarget.parameters);
  if (parameters.ok === false) {
    return {
      ok: false,
      error: parameters.error,
    };
  }

  const validation = validateFunctionShape({
    decoratorSpec: resolvedDecoratorSpec,
    functionName: entryTarget.name,
    functionParameters: parameters.value,
    kind: options.kind === "class-method" ? "class-method" : "function",
    returnAnnotation: entryTarget.returnAnnotation,
  });
  if (validation.ok === false) {
    return {
      ok: false,
      error: validation.error,
    };
  }

  return {
    ok: true,
    definition: {
      kind: options.kind === "class-method" ? "class-method" : "function",
      functionName: entryTarget.name,
      parameters: parameters.value.map((parameter) => {
        const globalInput = resolvedDecoratorSpec.globalInputs.find(
          (input) => input.name === parameter.name,
        );
        if (globalInput) {
          return {
            kind: "global-input",
            name: parameter.name,
            sourceName: globalInput.sourceName,
          };
        }

        return {
          kind: "input",
          name: parameter.name,
        };
      }),
      fields: [],
      inputs: resolvedDecoratorSpec.inputs,
      outputs: resolvedDecoratorSpec.outputs,
      globalInputs: resolvedDecoratorSpec.globalInputs,
      globalOutputs: resolvedDecoratorSpec.globalOutputs,
    },
  };
}

function attachGlobalOutputDefaults(
  globalOutputs: RuntimePort[],
  returnExpression: string | undefined,
): RuntimePort[] {
  if (!globalOutputs.length) return globalOutputs;

  const defaults =
    globalOutputs.length === 1
      ? [returnExpression]
      : returnExpression?.startsWith("(") && returnExpression.endsWith(")")
        ? splitTopLevel(returnExpression.slice(1, -1), ",")
        : splitTopLevel(returnExpression ?? "", ",");

  return globalOutputs.map((port, index) => ({
    ...port,
    defaultValue: defaults[index]?.trim(),
  }));
}

function attachClassFieldDefaults(
  decoratorSpec: EntryDecoratorSpec,
  initializerParameters: FunctionParameter[],
): { ok: true; value: EntryDecoratorSpec } | { ok: false; error: string } {
  const initializerParameterByName = new Map(
    initializerParameters
      .filter((parameter) => parameter.name !== "self")
      .map((parameter) => [parameter.name, parameter]),
  );

  const fields = decoratorSpec.fields.map((field) => {
    const initializerParameter = initializerParameterByName.get(field.name);
    return {
      ...field,
      defaultValue: initializerParameter?.defaultValue,
    };
  });

  return {
    ok: true,
    value: {
      ...decoratorSpec,
      fields,
    },
  };
}

function parseEntryDecoratorArguments(value: string):
  | { ok: true; value: EntryDecoratorSpec }
  | { ok: false; error: string } {
  const segments = splitTopLevel(value, ",");
  const fields: RuntimePort[] = [];
  const inputs: RuntimePort[] = [];
  const outputs: RuntimePort[] = [];
  const globalInputs: RuntimeGlobalReference[] = [];
  const globalOutputs: RuntimePort[] = [];

  for (const segment of segments) {
    if (!segment.trim()) continue;

    const assignmentIndex = findTopLevelAssignment(segment);
    if (assignmentIndex === -1) {
      return {
        ok: false,
        error: `Unsupported @entry argument "${segment.trim()}". Use keyword arguments only.`,
      };
    }

    const key = segment.slice(0, assignmentIndex).trim();
    const expression = segment.slice(assignmentIndex + 1).trim();
    const keyKind = parseDecoratorKey(key);
    if (!keyKind) {
      return {
        ok: false,
        error: `Unsupported @entry key "${key}". Use field_*, input_*, output_*, inputglobal_*, or outputglobal_*.`,
      };
    }

    if (keyKind.kind === "global-input") {
      const sourceName = parseGlobalReferenceExpression(expression);
      if (!sourceName) {
        return {
          ok: false,
          error: `Global input "${key}" must reference a global output as "*name".`,
        };
      }

      globalInputs.push({
        name: keyKind.name,
        sourceName,
      });
      continue;
    }

    const resolvedType = parseRuntimeTypeExpression(normalisePythonLiterals(expression));
    if (!resolvedType) {
      return {
        ok: false,
        error: `Could not parse runtime type "${expression}" in @entry.`,
      };
    }

    switch (keyKind.kind) {
      case "field":
        fields.push({
          name: keyKind.name,
          type: resolvedType,
        });
        break;
      case "input":
        inputs.push({
          name: keyKind.name,
          type: resolvedType,
        });
        break;
      case "output":
        outputs.push({
          name: keyKind.name,
          type: resolvedType,
        });
        break;
      case "global-output":
        globalOutputs.push({
          name: keyKind.name,
          type: resolvedType,
        });
        break;
    }
  }

  if (outputs.length === 0 && globalOutputs.length === 0) {
    return {
      ok: false,
      error: "@entry(...) must declare at least one output_* or outputglobal_*.",
    };
  }

  return {
    ok: true,
    value: {
      fields,
      inputs,
      outputs,
      globalInputs,
      globalOutputs,
    },
  };
}

function parseDecoratorKey(key: string):
  | { kind: "field"; name: string }
  | { kind: "input"; name: string }
  | { kind: "output"; name: string }
  | { kind: "global-input"; name: string }
  | { kind: "global-output"; name: string }
  | undefined {
  if (key.startsWith("field_")) {
    return parseNamedKey("field", key.slice("field_".length));
  }

  if (key.startsWith("inputglobal_")) {
    return parseNamedKey("global-input", key.slice("inputglobal_".length));
  }

  if (key.startsWith("global_")) {
    return parseNamedKey("global-input", key.slice("global_".length));
  }

  if (key.startsWith("outputglobal_")) {
    return parseNamedKey("global-output", key.slice("outputglobal_".length));
  }

  if (key.startsWith("input_")) {
    return parseNamedKey("input", key.slice("input_".length));
  }

  if (key.startsWith("output_")) {
    return parseNamedKey("output", key.slice("output_".length));
  }

  if (isLegacyOutputKeyword(key)) {
    return {
      kind: "output",
      name: "result",
    };
  }

  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
    return {
      kind: "input",
      name: key,
    };
  }

  return;
}

function parseNamedKey<
  TKind extends "field" | "input" | "output" | "global-input" | "global-output",
>(
  kind: TKind,
  name: string,
): { kind: TKind; name: string } | undefined {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
  return {
    kind,
    name,
  };
}

function parseGlobalReferenceExpression(expression: string): string | undefined {
  const trimmed = expression.trim();
  if (!trimmed.startsWith("*")) return;

  const name = trimmed.slice(1).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return;
  return name;
}

function parseFunctionParameters(value: string):
  | { ok: true; value: FunctionParameter[] }
  | { ok: false; error: string } {
  const segments = splitTopLevel(value, ",");
  const parameters: FunctionParameter[] = [];

  for (const segment of segments) {
    const trimmed = segment.trim();
    if (!trimmed || trimmed === "/" || trimmed === "*") continue;

    const starless = trimmed.replace(/^\*+/, "");
    const colonIndex = findTopLevelColon(starless);
    const equalsIndex = findTopLevelEquals(starless);
    const nameBoundary =
      colonIndex === -1
        ? equalsIndex === -1
          ? starless.length
          : equalsIndex
        : equalsIndex === -1
          ? colonIndex
          : Math.min(colonIndex, equalsIndex);

    const name = starless.slice(0, nameBoundary).trim();
    if (!name) {
      return {
        ok: false,
        error: `Could not parse function parameter "${trimmed}".`,
      };
    }

    let annotation: RuntimeType | undefined;
    if (colonIndex !== -1) {
      const annotationExpression = normalisePythonLiterals(
        starless.slice(colonIndex + 1, equalsIndex === -1 ? undefined : equalsIndex).trim(),
      );
      annotation = parseRuntimeTypeExpression(annotationExpression);
      if (!annotation) {
        return {
          ok: false,
          error: `Could not parse type annotation "${annotationExpression}" for parameter "${name}".`,
        };
      }
    }

    const defaultValue =
      equalsIndex === -1 ? undefined : starless.slice(equalsIndex + 1).trim() || undefined;

    parameters.push({
      name,
      annotation,
      defaultValue,
    });
  }

  return {
    ok: true,
    value: parameters,
  };
}

function validateFunctionShape({
  decoratorSpec,
  functionName,
  functionParameters,
  kind,
  returnAnnotation,
}: {
  decoratorSpec: EntryDecoratorSpec;
  functionName: string;
  functionParameters: FunctionParameter[];
  kind: "function" | "class-method";
  returnAnnotation?: string;
}):
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    } {
  if (decoratorSpec.fields.length > 0) {
    return {
      ok: false,
      error: "field_* declarations are only valid on class entries.",
    };
  }

  const visibleInputByName = new Map(decoratorSpec.inputs.map((port) => [port.name, port.type]));
  const globalInputByName = new Map(decoratorSpec.globalInputs.map((port) => [port.name, port]));

  for (const parameter of functionParameters) {
    const decoratorType = visibleInputByName.get(parameter.name);
    if (decoratorType) {
      if (
        parameter.annotation &&
        !isRuntimeTypeAssignable(parameter.annotation, decoratorType) &&
        !isRuntimeTypeAssignable(decoratorType, parameter.annotation)
      ) {
        return {
          ok: false,
          error: `Parameter "${parameter.name}" does not match its @entry(...) type.`,
        };
      }
      continue;
    }

    const globalInput = globalInputByName.get(parameter.name);
    if (globalInput) {
      globalInput.annotation = parameter.annotation;
      continue;
    }

    return {
      ok: false,
      error: `@entry(...) is missing a declaration for parameter "${parameter.name}" on "${functionName}".`,
    };
  }

  for (const input of decoratorSpec.inputs) {
    if (!functionParameters.some((parameter) => parameter.name === input.name)) {
      return {
        ok: false,
        error: `@entry(...) declares input "${input.name}" but the function signature does not.`,
      };
    }
  }

  for (const globalInput of decoratorSpec.globalInputs) {
    if (!functionParameters.some((parameter) => parameter.name === globalInput.name)) {
      return {
        ok: false,
        error: `@entry(...) declares global input "${globalInput.name}" but the function signature does not.`,
      };
    }
  }

  if (!returnAnnotation) {
    return {
      ok: false,
      error: `${kind === "class-method" ? "Method" : "Function"} "${functionName}" must declare a return annotation that matches @entry(...).`,
    };
  }

  const resolvedReturn = parseRuntimeTypeExpression(normalisePythonLiterals(returnAnnotation));
  if (!resolvedReturn) {
    return {
      ok: false,
      error: `Could not parse return annotation "${returnAnnotation}".`,
    };
  }

  const declaredOutputs = [...decoratorSpec.outputs, ...decoratorSpec.globalOutputs];
  const outputValidation = validateReturnAnnotation(resolvedReturn, declaredOutputs);
  if (outputValidation.ok === false) return outputValidation;

  for (const globalOutput of decoratorSpec.globalOutputs) {
    if (!globalOutput.defaultValue) {
      return {
        ok: false,
        error: `Global output "${globalOutput.name}" must have a default return value in code.`,
      };
    }
  }

  return {
    ok: true,
  };
}

function validateClassShape({
  className,
  decoratorSpec,
  initializerParameters,
}: {
  className: string;
  decoratorSpec: EntryDecoratorSpec;
  initializerParameters: FunctionParameter[];
}):
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    } {
  if (decoratorSpec.inputs.length > 0 || decoratorSpec.globalInputs.length > 0) {
    return {
      ok: false,
      error: "Class entries can declare field_* and output_*, but not input_* or inputglobal_*.",
    };
  }

  const initializerParameterByName = new Map(
    initializerParameters
      .filter((parameter) => parameter.name !== "self")
      .map((parameter) => [parameter.name, parameter]),
  );

  for (const field of decoratorSpec.fields) {
    const initializerParameter = initializerParameterByName.get(field.name);
    if (!initializerParameter) {
      return {
        ok: false,
        error: `field_${field.name} must have a matching __init__(..., ${field.name}=...) parameter.`,
      };
    }

    if (initializerParameter.defaultValue == null) {
      return {
        ok: false,
        error: `field_${field.name} must have a default value in __init__(...).`,
      };
    }

    if (
      initializerParameter.annotation &&
      !isRuntimeTypeAssignable(initializerParameter.annotation, field.type) &&
      !isRuntimeTypeAssignable(field.type, initializerParameter.annotation)
    ) {
      return {
        ok: false,
        error: `field_${field.name} does not match its __init__(...) type annotation.`,
      };
    }
  }

  for (const output of decoratorSpec.outputs) {
    if (output.type.kind !== "apply" || output.type.name !== "Class") continue;
    const [classType] = output.type.args;
    if (
      classType?.kind === "named" &&
      classType.name !== className &&
      formatRuntimeType(classType) !== className
    ) {
      return {
        ok: false,
        error: `Class output "${output.name}" references ${formatRuntimeType(classType)} but the entry class is ${className}.`,
      };
    }
  }

  return {
    ok: true,
  };
}

function countEntryDecorators(code: string): number {
  return code.match(/(^|\n)\s*@entry\b/g)?.length ?? 0;
}

function validateReturnAnnotation(
  resolvedReturn: RuntimeType,
  declaredOutputs: RuntimePort[],
):
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    } {
  if (declaredOutputs.length === 1) {
    const [declaredOutput] = declaredOutputs;
    if (
      isRuntimeTypeAssignable(resolvedReturn, declaredOutput.type) ||
      isRuntimeTypeAssignable(declaredOutput.type, resolvedReturn)
    ) {
      return {
        ok: true,
      };
    }

    return {
      ok: false,
      error: `Return annotation "${formatRuntimeType(resolvedReturn)}" does not match output "${declaredOutput.name}".`,
    };
  }

  if (resolvedReturn.kind !== "apply" || resolvedReturn.name !== "Tuple") {
    return {
      ok: false,
      error: "Functions with multiple output_* or outputglobal_* entries must return Tuple(...).",
    };
  }

  if (resolvedReturn.args.length !== declaredOutputs.length) {
    return {
      ok: false,
      error: `Return Tuple(...) has ${resolvedReturn.args.length} entries but @entry(...) declares ${declaredOutputs.length} outputs.`,
    };
  }

  for (const [index, declaredOutput] of declaredOutputs.entries()) {
    const returnedType = resolvedReturn.args[index];
    if (
      isRuntimeTypeAssignable(returnedType, declaredOutput.type) ||
      isRuntimeTypeAssignable(declaredOutput.type, returnedType)
    ) {
      continue;
    }

    return {
      ok: false,
      error: `Return entry ${index + 1} does not match output "${declaredOutput.name}".`,
    };
  }

  return {
    ok: true,
  };
}

function extractEntryDecoratorContent(code: string): { value: string; endIndex: number } | undefined {
  const decoratorIndex = code.indexOf("@entry");
  if (decoratorIndex === -1) return;

  const openParenIndex = code.indexOf("(", decoratorIndex);
  if (openParenIndex === -1) return;

  const closeParenIndex = findMatchingBracket(code, openParenIndex, "(", ")");
  if (closeParenIndex === -1) return;

  return {
    value: code.slice(openParenIndex + 1, closeParenIndex),
    endIndex: closeParenIndex,
  };
}

function extractEntryTarget(
  code: string,
  startIndex: number,
):
  | {
      kind: "function";
      name: string;
      parameters: string;
      returnAnnotation?: string;
      returnExpression?: string;
    }
  | {
      kind: "class";
      className: string;
      initializerParameters: FunctionParameter[];
    }
  | undefined {
  const targetIndex = findNextCodeTokenIndex(code, startIndex + 1);
  if (targetIndex === -1) return;

  if (code.startsWith("class", targetIndex)) {
    return extractEntryClassSignature(code, targetIndex);
  }

  if (code.startsWith("def", targetIndex)) {
    return extractEntryFunctionSignature(code, targetIndex);
  }

  return;
}

function extractEntryFunctionSignature(
  code: string,
  startIndex: number,
):
  | {
      kind: "function";
      name: string;
      parameters: string;
      returnAnnotation?: string;
      returnExpression?: string;
    }
  | undefined {
  const functionMatch = /def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  functionMatch.lastIndex = startIndex;
  const match = functionMatch.exec(code);
  if (!match || match.index !== startIndex) return;

  const name = match[1];
  const openParenIndex = code.indexOf("(", match.index);
  const closeParenIndex = findMatchingBracket(code, openParenIndex, "(", ")");
  if (closeParenIndex === -1) return;

  const signatureTail = code.slice(closeParenIndex + 1);
  const colonIndex = findTopLevelTerminator(signatureTail, ":");
  if (colonIndex === -1) return;

  const afterParameters = signatureTail.slice(0, colonIndex).trim();
  const arrowIndex = afterParameters.indexOf("->");

  return {
    kind: "function",
    name,
    parameters: code.slice(openParenIndex + 1, closeParenIndex),
    returnAnnotation: arrowIndex === -1 ? undefined : afterParameters.slice(arrowIndex + 2).trim(),
    returnExpression: extractFirstReturnExpression(signatureTail.slice(colonIndex + 1)),
  };
}

function extractEntryClassSignature(
  code: string,
  startIndex: number,
):
  | {
      kind: "class";
      className: string;
      initializerParameters: FunctionParameter[];
    }
  | undefined {
  const classMatch = /class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*:/g;
  classMatch.lastIndex = startIndex;
  const match = classMatch.exec(code);
  if (!match || match.index !== startIndex) return;

  const initializer = extractClassInitializerSignature(code.slice(classMatch.lastIndex));
  if (initializer?.ok === false) return;

  return {
    kind: "class",
    className: match[1],
    initializerParameters: initializer?.value ?? [],
  };
}

function extractClassInitializerSignature(
  classBody: string,
): { ok: true; value: FunctionParameter[] } | { ok: false; error: string } | undefined {
  const initializerMatch = /^\s+def\s+__init__\s*\(/m.exec(classBody);
  if (!initializerMatch) return;

  const absoluteOpenParenIndex = classBody.indexOf("(", initializerMatch.index);
  const closeParenIndex = findMatchingBracket(classBody, absoluteOpenParenIndex, "(", ")");
  if (closeParenIndex === -1) {
    return {
      ok: false,
      error: "Could not parse class __init__(...) parameters.",
    };
  }

  return parseFunctionParameters(classBody.slice(absoluteOpenParenIndex + 1, closeParenIndex));
}

function findNextCodeTokenIndex(code: string, startIndex: number) {
  for (let index = startIndex; index < code.length; index += 1) {
    if (/\s/.test(code[index])) continue;
    if (code[index] === "#") {
      const lineEnd = code.indexOf("\n", index);
      if (lineEnd === -1) return -1;
      index = lineEnd;
      continue;
    }
    return index;
  }

  return -1;
}

function extractFirstReturnExpression(functionBody: string): string | undefined {
  const match = /^\s+return\s+(.+)$/m.exec(functionBody);
  return match?.[1]?.trim();
}

function splitTopLevel(value: string, separator: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: '"' | "'" | undefined;

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const previous = value[index - 1];

    if (quote) {
      if (current === quote && previous !== "\\") {
        quote = undefined;
      }
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === "(" || current === "[" || current === "{") {
      depth += 1;
      continue;
    }

    if (current === ")" || current === "]" || current === "}") {
      depth -= 1;
      continue;
    }

    if (depth === 0 && current === separator) {
      segments.push(value.slice(start, index));
      start = index + 1;
    }
  }

  segments.push(value.slice(start));
  return segments;
}

function findMatchingBracket(
  value: string,
  openIndex: number,
  openChar: "(" | "[" | "{",
  closeChar: ")" | "]" | "}",
): number {
  let depth = 0;
  let quote: '"' | "'" | undefined;

  for (let index = openIndex; index < value.length; index += 1) {
    const current = value[index];
    const previous = value[index - 1];

    if (quote) {
      if (current === quote && previous !== "\\") {
        quote = undefined;
      }
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === openChar) {
      depth += 1;
      continue;
    }

    if (current === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function findTopLevelAssignment(value: string): number {
  return findTopLevelToken(value, "=");
}

function findTopLevelColon(value: string): number {
  return findTopLevelToken(value, ":");
}

function findTopLevelEquals(value: string): number {
  return findTopLevelToken(value, "=");
}

function findTopLevelTerminator(value: string, terminator: string): number {
  return findTopLevelToken(value, terminator);
}

function findTopLevelToken(value: string, token: string): number {
  let depth = 0;
  let quote: '"' | "'" | undefined;

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const previous = value[index - 1];

    if (quote) {
      if (current === quote && previous !== "\\") {
        quote = undefined;
      }
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === "(" || current === "[" || current === "{") {
      depth += 1;
      continue;
    }

    if (current === ")" || current === "]" || current === "}") {
      depth -= 1;
      continue;
    }

    if (depth === 0 && value.startsWith(token, index)) {
      return index;
    }
  }

  return -1;
}

function normalisePythonLiterals(value: string): string {
  return value.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bNone\b/g, "null");
}

function isLegacyOutputKeyword(value: string): boolean {
  return value === "return" || value === "returns" || value === "output";
}
