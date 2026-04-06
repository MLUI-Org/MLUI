import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { CodeEnabledNode } from "../base/CodeEnabledNode";
import type { CodeNodeProperties } from "../types";

export const NUMBER_SOURCE_NODE_TYPE = "mlui/number-source";

interface NumberSourceNodeProperties extends CodeNodeProperties {
  seed: number;
}

export class NumberSourceNode extends CodeEnabledNode<NumberSourceNodeProperties> {
  constructor() {
    super({
      title: "Number Source",
      type: NUMBER_SOURCE_NODE_TYPE,
      code: "def run(seed: int) -> int:\n    return seed",
      normalSize: [220, 120],
      properties: {
        seed: 7,
      },
    });

    this.pos = [80, 120];
    this.addOutput("value", "number");
  }

  onExecute() {
    this.setOutputData(0, this.properties.seed);
  }
}

export function registerNumberSourceNode() {
  registerNodeType(NUMBER_SOURCE_NODE_TYPE, NumberSourceNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
