import { type LGraph, type LGraphNode } from "@mlui/litegraph";

import {
  DecoratorResolvedCodeNode,
  globalWidgetPropertyName,
  parseGlobalDefaultValue,
} from "../base/DecoratorResolvedCodeNode";
import { ImportCodeNode } from "../base/ImportCodeNode";
import { WorkflowCodeNode } from "../base/WorkflowCodeNode";
import type { EntryDefinition, RuntimeParameter } from "../type-system/entryResolver";

export interface CompileWorkflowResult {
  ok: boolean;
  python: string;
  errors: string[];
}

type CompilableNode = DecoratorResolvedCodeNode | ImportCodeNode | WorkflowCodeNode;

type RuntimeEntryNode = DecoratorResolvedCodeNode & {
  resolvedEntryDefinition: EntryDefinition;
};

export function compileWorkflowToPython(graph: LGraph): CompileWorkflowResult {
  const errors: string[] = [];
  const imports: string[] = [];
  const functionBlocks: string[] = [];
  const modelBlocks: string[] = [];
  const executionLines: string[] = [];
  const outputVariableBySlot = new Map<string, string>();
  const nodes = graph.nodes.filter(isCompilableNode);
  const entryNodes: RuntimeEntryNode[] = [];
  const workflowNodes: WorkflowCodeNode[] = [];

  for (const node of nodes) {
    if (node instanceof ImportCodeNode) {
      if (!node.validateImports({ reportErrors: true })) {
        errors.push(`${node.title}: ${String(node.properties.importError ?? "Invalid imports.")}`);
        continue;
      }
      imports.push(node.code.trim());
      continue;
    }

    if (node instanceof WorkflowCodeNode) {
      workflowNodes.push(node);
      continue;
    }

    if (!node.resolveCodeEntryPoint({ reportErrors: true, validateGlobals: true })) {
      errors.push(`${node.title}: ${String(node.properties.entryError ?? "Invalid entry node.")}`);
      continue;
    }

    if (node.resolvedEntryDefinition) {
      entryNodes.push(node as RuntimeEntryNode);
    }
  }

  const classBlocks = compileClassBlocks(graph, entryNodes, errors);
  modelBlocks.push(...compileMLModelBlocks(graph, workflowNodes, errors));

  for (const node of entryNodes) {
    const definition = node.resolvedEntryDefinition;
    if (definition.kind !== "function") continue;

    const functionBlock = removeEntryDecorator(node.code).trim();
    if (functionBlock) functionBlocks.push(functionBlock);
  }

  if (errors.length) {
    return {
      ok: false,
      python: "",
      errors,
    };
  }

  for (const node of sortWorkflowNodes(graph, workflowNodes)) {
    if (node.properties.workflowKind !== "ml-model") continue;

    executionLines.push(`${modelVariableName(node)} = ${modelClassName(node)}()`);
    outputVariableBySlot.set(outputSlotKey(node.id, 0), modelVariableName(node));
  }

  for (const node of sortCodeNodes(graph, entryNodes)) {
    const definition = node.resolvedEntryDefinition;

    if (definition.kind === "class") {
      if (!shouldInstantiateClassNode(graph, node)) continue;

      const instanceVariable = classInstanceVariableName(node);
      const fieldArguments = definition.fields.map((field) => {
        const value = resolveClassFieldArgument({
          fieldName: field.name,
          graph,
          node,
          outputVariableBySlot,
        });
        return `${field.name}=${value ?? toPythonLiteral(parseGlobalDefaultValue(field.defaultValue))}`;
      });

      executionLines.push(
        `${instanceVariable} = ${definition.className ?? definition.functionName}(${fieldArguments.join(", ")})`,
      );

      for (const [index] of definition.outputs.entries()) {
        outputVariableBySlot.set(outputSlotKey(node.id, index), instanceVariable);
      }
      continue;
    }

    if (!definition.outputs.length && definition.globalOutputs.length) {
      for (const globalOutput of definition.globalOutputs) {
        const propertyName = globalWidgetPropertyName(globalOutput);
        const value = node.properties[propertyName] ?? parseGlobalDefaultValue(globalOutput.defaultValue);
        executionLines.push(`${globalOutput.name} = ${toPythonLiteral(value)}`);
      }
      continue;
    }

    const receiver = definition.kind === "class-method" ? findReceiverClassNode(graph, node) : undefined;
    if (definition.kind === "class-method" && !receiver) {
      errors.push(`${node.title}: Class method nodes must connect their self input to a class node.`);
      continue;
    }

    if (definition.kind === "class-method") {
      continue;
    }

    const args = callParameters(definition).map((parameter) =>
      resolveCallArgument({
        definition,
        graph,
        node,
        outputVariableBySlot,
        parameter,
        receiver,
      }),
    );

    const outputNames = [
      ...definition.outputs.map((output, index) => {
        const variableName = pythonVariableName(`${node.id}_${output.name}`);
        outputVariableBySlot.set(outputSlotKey(node.id, index), variableName);
        return variableName;
      }),
      ...definition.globalOutputs.map((output) => output.name),
    ];
    const assignmentTarget =
      outputNames.length === 1 ? outputNames[0] : `(${outputNames.join(", ")})`;
    const callee = definition.functionName;

    executionLines.push(`${assignmentTarget} = ${callee}(${args.join(", ")})`);
  }

  if (errors.length) {
    return {
      ok: false,
      python: "",
      errors,
    };
  }

  const python = [
    "# Generated by MLUI",
    "from __future__ import annotations",
    "",
    uniqueBlocks(imports).filter(Boolean).join("\n\n"),
    "",
    uniqueBlocks(functionBlocks).join("\n\n"),
    "",
    classBlocks.join("\n\n"),
    "",
    modelBlocks.join("\n\n"),
    "",
    "def main():",
    indentLines(executionLines.length ? executionLines.join("\n") : "pass"),
    "",
    "",
    'if __name__ == "__main__":',
    "    main()",
  ]
    .filter((section) => section.length > 0)
    .join("\n");

  return {
    ok: true,
    python,
    errors: [],
  };
}

function resolveClassFieldArgument({
  fieldName,
  graph,
  node,
  outputVariableBySlot,
}: {
  fieldName: string;
  graph: LGraph;
  node: RuntimeEntryNode;
  outputVariableBySlot: Map<string, string>;
}) {
  const slotIndex = node.inputs.findIndex((input) => input.name === fieldName);
  const input = slotIndex === -1 ? undefined : node.inputs[slotIndex];
  const link = graph.getLink(input?.link);
  if (!link) return undefined;

  return (
    outputVariableBySlot.get(outputSlotKey(link.origin_id, link.origin_slot)) ??
    `node_${String(link.origin_id)}_output_${link.origin_slot}`
  );
}

function compileMLModelBlocks(
  graph: LGraph,
  nodes: WorkflowCodeNode[],
  errors: string[],
) {
  return nodes
    .filter((node) => node.properties.workflowKind === "ml-model")
    .map((modelNode) => {
      const orchestrators = collectOrchestratorChain(graph, modelNode, errors);
      const initializerLines = [
        "# MLModel hyperparameters",
        modelNode.code.trim(),
        ...orchestrators.flatMap((node) => [
          "",
          `# ${node.title}`,
          node.code.trim(),
        ]),
      ]
        .filter((line) => line.length > 0)
        .join("\n");

      return [
        `class ${modelClassName(modelNode)}:`,
        indentLines("def __init__(self):"),
        indentLines(indentLines(initializerLines || "pass")),
      ].join("\n");
    });
}

function collectOrchestratorChain(
  graph: LGraph,
  modelNode: WorkflowCodeNode,
  errors: string[],
) {
  const ordered: WorkflowCodeNode[] = [];
  const visited = new Set<WorkflowCodeNode>();
  let current = linkedWorkflowInput(graph, modelNode, "chain");

  while (current) {
    if (current.properties.workflowKind !== "orchestrator") {
      errors.push(`${modelNode.title}: chain input must come from an orchestrator node.`);
      break;
    }

    if (visited.has(current)) {
      errors.push(`${modelNode.title}: orchestrator chain contains a cycle.`);
      break;
    }

    visited.add(current);
    ordered.unshift(current);
    current = linkedWorkflowInput(graph, current, "scope");
  }

  return ordered;
}

function linkedWorkflowInput(
  graph: LGraph,
  node: WorkflowCodeNode,
  inputName: string,
) {
  const input = node.inputs.find((slot) => slot.name === inputName);
  const link = graph.getLink(input?.link);
  const originNode = link ? graph.getNodeById(link.origin_id) : undefined;
  return originNode instanceof WorkflowCodeNode ? originNode : undefined;
}

function sortWorkflowNodes(graph: LGraph, nodes: WorkflowCodeNode[]) {
  const pending = new Set(nodes);
  const sorted: WorkflowCodeNode[] = [];

  while (pending.size > 0) {
    const ready = [...pending].find((node) =>
      node.inputs.every((input) => {
        const link = graph.getLink(input.link);
        return !link || !pending.has(graph.getNodeById(link.origin_id) as WorkflowCodeNode);
      }),
    );

    if (!ready) {
      sorted.push(...pending);
      break;
    }

    sorted.push(ready);
    pending.delete(ready);
  }

  return sorted;
}

function shouldInstantiateClassNode(graph: LGraph, node: RuntimeEntryNode) {
  const classOutputIndexes = new Set(
    node.outputs
      .map((output, index) => ({ output, index }))
      .filter(({ output }) => output.name !== "chain")
      .map(({ index }) => index),
  );

  for (const candidate of graph.nodes) {
    if (!(candidate instanceof DecoratorResolvedCodeNode)) continue;
    if (candidate.resolvedEntryDefinition?.kind === "class-method") continue;

    for (const input of candidate.inputs) {
      const link = graph.getLink(input.link);
      if (!link || link.origin_id !== node.id) continue;
      if (classOutputIndexes.has(link.origin_slot)) return true;
    }
  }

  return false;
}

function compileClassBlocks(graph: LGraph, nodes: RuntimeEntryNode[], errors: string[]) {
  const classNodes = nodes.filter((node) => node.resolvedEntryDefinition.kind === "class");
  const methodNodesByClassName = new Map<string, RuntimeEntryNode[]>();
  const classSourceByName = new Map<string, string>();

  for (const methodNode of nodes.filter(
    (node) => node.resolvedEntryDefinition.kind === "class-method",
  )) {
    const receiver = findReceiverClassNode(graph, methodNode);
    const className =
      receiver?.resolvedEntryDefinition.className ?? methodNode.ownerClassName ?? undefined;

    if (!className) {
      errors.push(`${methodNode.title}: Class method nodes must connect to a class node.`);
      continue;
    }

    const methods = methodNodesByClassName.get(className) ?? [];
    methods.push(methodNode);
    methodNodesByClassName.set(className, methods);
  }

  for (const classNode of classNodes) {
    const definition = classNode.resolvedEntryDefinition;
    const className = definition.className ?? definition.functionName;
    const classSource = removeEntryDecorator(classNode.code).trimEnd();
    const existingClassSource = classSourceByName.get(className);

    if (existingClassSource && existingClassSource !== classSource) {
      errors.push(`${classNode.title}: Multiple class nodes define different code for ${className}.`);
      continue;
    }

    classSourceByName.set(className, classSource);
  }

  for (const className of methodNodesByClassName.keys()) {
    if (!classSourceByName.has(className)) {
      errors.push(`Class methods reference ${className}, but no class node defines it.`);
    }
  }

  if (errors.length) return [];

  return [...classSourceByName.entries()].map(([className, classSource]) => {
    const methods = uniqueMethodBlocks(methodNodesByClassName.get(className) ?? [], errors);
    const methodSource = methods.map((method) => indentLines(removeEntryDecorator(method.code).trim()));
    return [classSource, ...methodSource.map((method) => `\n${method}`)].join("\n");
  });
}

function uniqueMethodBlocks(nodes: RuntimeEntryNode[], errors: string[]) {
  const methodByName = new Map<string, RuntimeEntryNode>();
  const ordered: RuntimeEntryNode[] = [];

  for (const node of nodes) {
    const methodName = node.resolvedEntryDefinition.functionName;
    const previous = methodByName.get(methodName);
    if (!previous) {
      methodByName.set(methodName, node);
      ordered.push(node);
      continue;
    }

    if (normalisePythonSource(removeEntryDecorator(previous.code)) !== normalisePythonSource(removeEntryDecorator(node.code))) {
      errors.push(`${node.title}: Duplicate class method "${methodName}" has different code.`);
    }
  }

  return ordered;
}

function callParameters(definition: EntryDefinition) {
  if (definition.kind !== "class-method") return definition.parameters;
  return definition.parameters.filter(
    (parameter) => !(parameter.kind === "input" && parameter.name === "self"),
  );
}

function resolveCallArgument({
  definition,
  graph,
  node,
  outputVariableBySlot,
  parameter,
  receiver,
}: {
  definition: EntryDefinition;
  graph: LGraph;
  node: RuntimeEntryNode;
  outputVariableBySlot: Map<string, string>;
  parameter: RuntimeParameter;
  receiver?: RuntimeEntryNode;
}) {
  if (parameter.kind === "global-input") {
    if (
      definition.kind === "class-method" &&
      receiver?.resolvedEntryDefinition.fields.some((field) => field.name === parameter.sourceName)
    ) {
      return `${classInstanceVariableName(receiver)}.${parameter.sourceName}`;
    }

    return parameter.sourceName;
  }

  const slotIndex = node.inputs.findIndex((input) => input.name === parameter.name);
  const input = slotIndex === -1 ? undefined : node.inputs[slotIndex];
  const link = graph.getLink(input?.link);
  if (!link) return "None";

  return (
    outputVariableBySlot.get(outputSlotKey(link.origin_id, link.origin_slot)) ??
    `node_${String(link.origin_id)}_output_${link.origin_slot}`
  );
}

function findReceiverClassNode(graph: LGraph, node: RuntimeEntryNode): RuntimeEntryNode | undefined {
  const selfInputIndex = node.inputs.findIndex((input) => input.name === "self");
  const candidateInputs = selfInputIndex === -1 ? node.inputs : [node.inputs[selfInputIndex]];

  for (const input of candidateInputs) {
    const link = graph.getLink(input.link);
    const originNode = link ? graph.getNodeById(link.origin_id) : undefined;
    if (!(originNode instanceof DecoratorResolvedCodeNode)) continue;
    if (originNode.resolvedEntryDefinition?.kind !== "class") continue;
    return originNode as RuntimeEntryNode;
  }

  const ownerClassName = node.ownerClassName;
  if (!ownerClassName) return;

  const matches = graph.nodes.filter(
    (candidate): candidate is RuntimeEntryNode =>
      candidate instanceof DecoratorResolvedCodeNode &&
      candidate.resolvedEntryDefinition?.kind === "class" &&
      candidate.resolvedEntryDefinition.className === ownerClassName,
  );

  return matches.length === 1 ? matches[0] : undefined;
}

function isCompilableNode(node: LGraphNode): node is CompilableNode {
  return (
    node instanceof DecoratorResolvedCodeNode ||
    node instanceof ImportCodeNode ||
    node instanceof WorkflowCodeNode
  );
}

function sortCodeNodes(graph: LGraph, nodes: RuntimeEntryNode[]) {
  const pending = new Set(nodes);
  const sorted: RuntimeEntryNode[] = [];

  while (pending.size > 0) {
    const ready = [...pending].find((node) =>
      node.inputs.every((input) => {
        const link = graph.getLink(input.link);
        return !link || !pending.has(graph.getNodeById(link.origin_id) as RuntimeEntryNode);
      }),
    );

    if (!ready) {
      sorted.push(...pending);
      break;
    }

    sorted.push(ready);
    pending.delete(ready);
  }

  return sorted;
}

function removeEntryDecorator(code: string) {
  const decoratorIndex = code.indexOf("@entry");
  if (decoratorIndex === -1) return code;

  const openParenIndex = code.indexOf("(", decoratorIndex);
  if (openParenIndex === -1) return code;

  const closeParenIndex = findMatchingParen(code, openParenIndex);
  if (closeParenIndex === -1) return code;

  const lineStart = code.lastIndexOf("\n", decoratorIndex) + 1;
  const lineEnd = code.indexOf("\n", closeParenIndex);
  return `${code.slice(0, lineStart)}${lineEnd === -1 ? "" : code.slice(lineEnd + 1)}`;
}

function findMatchingParen(value: string, openIndex: number) {
  let depth = 0;
  let quote: '"' | "'" | undefined;

  for (let index = openIndex; index < value.length; index += 1) {
    const current = value[index];
    const previous = value[index - 1];

    if (quote) {
      if (current === quote && previous !== "\\") quote = undefined;
      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === "(") depth += 1;
    if (current === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function indentLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => (line ? `    ${line}` : ""))
    .join("\n");
}

function classInstanceVariableName(node: LGraphNode) {
  return pythonVariableName(`${node.id}_${node.title || node.type || "class"}`);
}

function modelClassName(node: LGraphNode) {
  return pythonIdentifier(`${node.title || "MLModel"}_${node.id}`, "MLModel");
}

function modelVariableName(node: LGraphNode) {
  return pythonVariableName(`${node.id}_${node.title || "model"}`);
}

function pythonVariableName(value: string) {
  return pythonIdentifier(value, "value").toLowerCase();
}

function pythonIdentifier(value: string, fallback: string) {
  const safe = value.replace(/[^A-Za-z0-9_]/g, "_").replace(/^_+/, "");
  const withPrefix = /^[A-Za-z_]/.test(safe) ? safe : `${fallback}_${safe}`;
  return withPrefix || fallback;
}

function outputSlotKey(nodeId: LGraphNode["id"], slotIndex: number) {
  return `${String(nodeId)}:${slotIndex}`;
}

function toPythonLiteral(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value == null) return "None";
  return JSON.stringify(String(value));
}

function uniqueBlocks(blocks: string[]) {
  return [...new Set(blocks.map((block) => block.trim()).filter(Boolean))];
}

function normalisePythonSource(value: string) {
  return value.trim().replace(/\r\n/g, "\n");
}
