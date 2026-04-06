import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { ImportCodeNode } from "../base/ImportCodeNode";

export const IMPORTS_NODE_TYPE = "mlui/imports";

export class ImportsNode extends ImportCodeNode {
  constructor() {
    super({
      title: "Imports",
      type: IMPORTS_NODE_TYPE,
      code: [
        "import torch",
        "import torch.nn as nn",
        "",
        "Tensor = torch.Tensor",
        "Float32 = torch.float32",
        "Int = int",
      ].join("\n"),
      normalSize: [260, 140],
    });

    this.pos = [80, -80];
  }
}

export function registerImportsNode() {
  registerNodeType(IMPORTS_NODE_TYPE, ImportsNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
