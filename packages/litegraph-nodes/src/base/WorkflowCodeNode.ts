import { CodeEnabledNode } from "./CodeEnabledNode";
import type { CodeEnabledNodeOptions, CodeNodeProperties } from "../types";

export interface WorkflowCodeNodeProperties extends CodeNodeProperties {
  workflowKind: "ml-model" | "orchestrator";
}

type WorkflowSlot = {
  name: string;
  type: string;
};

export interface WorkflowCodeNodeOptions<TProperties extends WorkflowCodeNodeProperties>
  extends CodeEnabledNodeOptions<TProperties> {
  inputs?: WorkflowSlot[];
  outputs?: WorkflowSlot[];
  workflowKind: WorkflowCodeNodeProperties["workflowKind"];
}

export abstract class WorkflowCodeNode<
  TProperties extends WorkflowCodeNodeProperties = WorkflowCodeNodeProperties,
> extends CodeEnabledNode<TProperties> {
  protected constructor({
    inputs = [],
    outputs = [],
    workflowKind,
    properties,
    ...options
  }: WorkflowCodeNodeOptions<TProperties>) {
    super({
      ...options,
      properties: {
        ...properties,
        workflowKind,
      } as Partial<TProperties>,
    });

    for (const input of inputs) {
      this.addInput(input.name, input.type);
    }

    for (const output of outputs) {
      this.addOutput(output.name, output.type);
    }
  }
}

export function isWorkflowCodeNode(value: unknown): value is WorkflowCodeNode {
  return value instanceof WorkflowCodeNode;
}
