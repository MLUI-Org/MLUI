import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { CodeEnabledNode } from "../base/CodeEnabledNode";
import type { CodeNodeProperties } from "../types";

export const NUMBER_SINK_NODE_TYPE = "mlui/debug-sink";

export class NumberSinkNode extends CodeEnabledNode<CodeNodeProperties> {
  constructor() {
    super({
      title: "Debug Sink",
      type: NUMBER_SINK_NODE_TYPE,
      code: "def run(value):\n    return value",
      normalSize: [220, 120],
    });

    this.pos = [380, 120];
    this.addInput("value", "number");
  }
}

export function registerNumberSinkNode() {
  registerNodeType(NUMBER_SINK_NODE_TYPE, NumberSinkNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
