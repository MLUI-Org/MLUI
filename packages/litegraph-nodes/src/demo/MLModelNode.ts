import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { WorkflowCodeNode } from "../base/WorkflowCodeNode";

export const ML_MODEL_NODE_TYPE = "mlui/ml-model";

export class MLModelNode extends WorkflowCodeNode {
  constructor() {
    super({
      title: "ML Model",
      type: ML_MODEL_NODE_TYPE,
      workflowKind: "ml-model",
      code: [
        "# Hyperparameters available to upstream orchestrator code at compile time.",
        "scaling_factor = 0.18215",
      ].join("\n"),
      inputs: [
        {
          name: "chain",
          type: "OrchestratorChain",
        },
      ],
      outputs: [
        {
          name: "model",
          type: "MLModel",
        },
      ],
      normalSize: [300, 120],
    });

    this.pos = [1040, 120];
  }
}

export function registerMLModelNode() {
  registerNodeType(ML_MODEL_NODE_TYPE, MLModelNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
