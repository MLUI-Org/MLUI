import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { WorkflowCodeNode } from "../base/WorkflowCodeNode";

export const ORCHESTRATOR_GLOBALS_NODE_TYPE = "mlui/orchestrator-globals";

export class OrchestratorGlobalsNode extends WorkflowCodeNode {
  constructor() {
    super({
      title: "Orch 1 Globals",
      type: ORCHESTRATOR_GLOBALS_NODE_TYPE,
      workflowKind: "orchestrator",
      code: [
        "# Runs inside the MLModel initializer.",
        "# These names are supplied by the downstream MLModel node.",
        "latent_scale = scaling_factor",
      ].join("\n"),
      outputs: [
        {
          name: "chain",
          type: "OrchestratorChain",
        },
      ],
      normalSize: [280, 120],
    });

    this.pos = [360, 120];
  }
}

export function registerOrchestratorGlobalsNode() {
  registerNodeType(ORCHESTRATOR_GLOBALS_NODE_TYPE, OrchestratorGlobalsNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
