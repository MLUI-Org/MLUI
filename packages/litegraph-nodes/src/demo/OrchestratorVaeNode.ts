import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { WorkflowCodeNode } from "../base/WorkflowCodeNode";

export const ORCHESTRATOR_VAE_NODE_TYPE = "mlui/orchestrator-vae";

export class OrchestratorVaeNode extends WorkflowCodeNode {
  constructor() {
    super({
      title: "Orch 2 VAE",
      type: ORCHESTRATOR_VAE_NODE_TYPE,
      workflowKind: "orchestrator",
      code: [
        "# Inherits names from previous orchestrators.",
        "# The connected class chain makes ExplicitVAE available.",
        "self.vae = ExplicitVAE(scaling_factor=latent_scale)",
      ].join("\n"),
      inputs: [
        {
          name: "scope",
          type: "OrchestratorChain",
        },
        {
          name: "vae",
          type: "ClassChain(ExplicitVAE)",
        },
      ],
      outputs: [
        {
          name: "chain",
          type: "OrchestratorChain",
        },
      ],
      normalSize: [300, 140],
    });

    this.pos = [700, 120];
  }
}

export function registerOrchestratorVaeNode() {
  registerNodeType(ORCHESTRATOR_VAE_NODE_TYPE, OrchestratorVaeNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
