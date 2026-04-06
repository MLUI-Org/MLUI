import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const TENSOR_SOURCE_NODE_TYPE = "mlui/tensor-source";

export class TensorSourceNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "Tensor Source",
      type: TENSOR_SOURCE_NODE_TYPE,
      code: [
        "@entry(",
        '    output_tensor=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        ")",
        'def make_tensor() -> Tensor(Float32, Shape("batch", "channels", "height", "width")):',
        "    return torch.randn(1, 3, 64, 64, dtype=torch.float32)",
      ].join("\n"),
      normalSize: [240, 120],
    });

    this.pos = [80, 120];
  }

  onExecute() {
    this.setOutputData(
      0,
      ({
        kind: "tensor",
        dtype: "float32",
        shape: [1, 768],
      } as unknown),
    );
  }
}

export function registerTensorSourceNode() {
  registerNodeType(TENSOR_SOURCE_NODE_TYPE, TensorSourceNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
