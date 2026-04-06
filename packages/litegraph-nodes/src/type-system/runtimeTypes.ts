import { LiteGraph, type ISlotType } from "@mlui/litegraph";
import * as ts from "typescript";

export type RuntimeType =
  | { kind: "named"; name: string }
  | { kind: "literal"; value: string | number | boolean | null }
  | { kind: "apply"; name: string; args: RuntimeType[] };

export interface RuntimePort {
  name: string;
  type: RuntimeType;
  defaultValue?: string;
}

type RuntimeLiteralValue = string | number | boolean | null;

const BUILTIN_NAME_ALIASES = new Map<string, string>([
  ["any", "Any"],
  ["bool", "Bool"],
  ["boolean", "Bool"],
  ["class", "Class"],
  ["classchain", "ClassChain"],
  ["dict", "Dict"],
  ["float", "Float"],
  ["float32", "Float32"],
  ["float64", "Float64"],
  ["int", "Int"],
  ["int32", "Int32"],
  ["int64", "Int64"],
  ["list", "List"],
  ["none", "None"],
  ["number", "Number"],
  ["optional", "Optional"],
  ["shape", "Shape"],
  ["str", "String"],
  ["string", "String"],
  ["tensor", "Tensor"],
  ["tuple", "Tuple"],
  ["union", "Union"],
]);

let installed = false;
let fallbackIsValidConnection:
  | ((typeA: ISlotType, typeB: ISlotType) => boolean)
  | undefined;

export function ensureResolvedTypeSystemInstalled() {
  if (installed) return;

  fallbackIsValidConnection = LiteGraph.isValidConnection.bind(LiteGraph);
  LiteGraph.isValidConnection = (typeA, typeB) => {
    const resolved = canConnectResolvedSlotTypes(typeA, typeB);
    if (resolved != null) return resolved;
    return fallbackIsValidConnection?.(typeA, typeB) ?? false;
  };

  installed = true;
}

export function canConnectResolvedSlotTypes(
  typeA: ISlotType,
  typeB: ISlotType,
): boolean | undefined {
  if (typeof typeA !== "string" || typeof typeB !== "string") return;
  if (typeA.length === 0 || typeB.length === 0) return;
  if (typeA === "*" || typeB === "*") return;
  if (containsTopLevelComma(typeA) || containsTopLevelComma(typeB)) return;

  const outputType = parseRuntimeTypeExpression(typeA);
  const inputType = parseRuntimeTypeExpression(typeB);
  if (!outputType || !inputType) return;

  return isRuntimeTypeAssignable(outputType, inputType);
}

export function parseRuntimeTypeExpression(expression: string): RuntimeType | undefined {
  const source = ts.createSourceFile(
    "runtime-type.ts",
    `const __runtime_type = ${expression};`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const statement = source.statements[0];
  if (!statement || !ts.isVariableStatement(statement)) return;

  const declaration = statement.declarationList.declarations[0];
  if (!declaration?.initializer) return;

  try {
    return resolveRuntimeTypeNode(declaration.initializer);
  } catch {
    return;
  }
}

export function formatRuntimeType(type: RuntimeType): string {
  switch (type.kind) {
    case "named":
      return normaliseTypeName(type.name);
    case "literal":
      return formatLiteral(type.value);
    case "apply":
      return `${normaliseTypeName(type.name)}(${type.args.map(formatRuntimeType).join(", ")})`;
  }
}

export function isRuntimeTypeAssignable(outputType: RuntimeType, inputType: RuntimeType): boolean {
  if (isAnyType(inputType) || isAnyType(outputType)) return true;

  if (inputType.kind === "apply" && normaliseTypeName(inputType.name) === "Optional") {
    const [member] = inputType.args;
    return isNoneType(outputType) || (member != null && isRuntimeTypeAssignable(outputType, member));
  }

  if (inputType.kind === "apply" && normaliseTypeName(inputType.name) === "Union") {
    return inputType.args.some((member) => isRuntimeTypeAssignable(outputType, member));
  }

  if (outputType.kind === "apply" && normaliseTypeName(outputType.name) === "Union") {
    return outputType.args.every((member) => isRuntimeTypeAssignable(member, inputType));
  }

  switch (outputType.kind) {
    case "literal":
      return inputType.kind === "literal" && outputType.value === inputType.value;
    case "named":
      return inputType.kind === "named"
        ? normaliseTypeName(outputType.name) === normaliseTypeName(inputType.name)
        : false;
    case "apply":
      if (inputType.kind !== "apply") return false;
      if (normaliseTypeName(outputType.name) !== normaliseTypeName(inputType.name)) {
        return false;
      }

      if (outputType.args.length !== inputType.args.length) return false;
      return outputType.args.every((member, index) =>
        isRuntimeTypeAssignable(member, inputType.args[index]),
      );
  }
  return false;
}

function resolveRuntimeTypeNode(node: ts.Expression): RuntimeType {
  if (ts.isParenthesizedExpression(node)) {
    return resolveRuntimeTypeNode(node.expression);
  }

  if (ts.isIdentifier(node)) {
    return {
      kind: "named",
      name: normaliseTypeName(node.text),
    };
  }

  if (ts.isPropertyAccessExpression(node)) {
    return {
      kind: "named",
      name: `${resolvePropertyAccessPath(node)}`,
    };
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return {
      kind: "literal",
      value: node.text,
    };
  }

  if (ts.isNumericLiteral(node)) {
    return {
      kind: "literal",
      value: Number(node.text),
    };
  }

  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return {
      kind: "literal",
      value: true,
    };
  }

  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return {
      kind: "literal",
      value: false,
    };
  }

  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return {
      kind: "literal",
      value: null,
    };
  }

  if (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand)) {
    const value = Number(node.operand.text);
    if (node.operator === ts.SyntaxKind.MinusToken) {
      return {
        kind: "literal",
        value: -value,
      };
    }
    if (node.operator === ts.SyntaxKind.PlusToken) {
      return {
        kind: "literal",
        value,
      };
    }
  }

  if (ts.isCallExpression(node)) {
    const callee = resolveCalleeName(node.expression);
    return {
      kind: "apply",
      name: callee,
      args: node.arguments.map((argument) => resolveRuntimeTypeNode(argument)),
    };
  }

  throw new Error(`Unsupported runtime type expression: ${node.getText()}`);
}

function resolveCalleeName(node: ts.LeftHandSideExpression): string {
  if (ts.isIdentifier(node)) {
    return normaliseTypeName(node.text);
  }

  if (ts.isPropertyAccessExpression(node)) {
    return resolvePropertyAccessPath(node);
  }

  throw new Error(`Unsupported runtime type callee: ${node.getText()}`);
}

function resolvePropertyAccessPath(node: ts.PropertyAccessExpression): string {
  const left = ts.isIdentifier(node.expression)
    ? normaliseTypeName(node.expression.text)
    : ts.isPropertyAccessExpression(node.expression)
      ? resolvePropertyAccessPath(node.expression)
      : node.expression.getText();

  return `${left}.${node.name.text}`;
}

function normaliseTypeName(name: string): string {
  return BUILTIN_NAME_ALIASES.get(name.toLowerCase()) ?? name;
}

function formatLiteral(value: RuntimeLiteralValue): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (value === null) return "None";
  return String(value);
}

function isAnyType(type: RuntimeType): boolean {
  return type.kind === "named" && normaliseTypeName(type.name) === "Any";
}

function isNoneType(type: RuntimeType): boolean {
  return (
    (type.kind === "named" && normaliseTypeName(type.name) === "None") ||
    (type.kind === "literal" && type.value === null)
  );
}

function containsTopLevelComma(value: string): boolean {
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

    if (depth === 0 && current === ",") return true;
  }

  return false;
}
