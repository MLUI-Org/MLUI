import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const HYPERPARAMETERS_NODE_TYPE = "mlui/hyperparameters";

export class HyperparametersNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "Hyperparameters",
      type: HYPERPARAMETERS_NODE_TYPE,
      code: [
        "@entry(",
        "    outputglobal_scaling_factor=Float32,",
        ")",
        "def hyperparameters() -> Float32:",
        "    return 0.18215",
      ].join("\n"),
      normalSize: [240, 120],
    });

    this.pos = [80, 300];
  }
}

export function registerHyperparametersNode() {
  registerNodeType(HYPERPARAMETERS_NODE_TYPE, HyperparametersNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
