import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const TENSOR_NORMALIZE_NODE_TYPE = "mlui/tensor-normalize";

export class TensorNormalizeNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "Tensor Normalize",
      type: TENSOR_NORMALIZE_NODE_TYPE,
      code: [
        "@entry(",
        '    input_tensor=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        "    inputglobal_scaling_factor=*scaling_factor,",
        '    output_tensor=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        ")",
        'def normalize(tensor: Tensor(Float32, Shape("batch", "channels", "height", "width")), scaling_factor: Float32) -> Tensor(Float32, Shape("batch", "channels", "height", "width")):',
        "    return tensor.clamp(0.0, 1.0)",
      ].join("\n"),
      normalSize: [260, 140],
    });

    this.pos = [400, 120];
  }

  onExecute() {
    const inputData = (this as unknown as { getInputData(slot: number): unknown }).getInputData?.(0);
    this.setOutputData(0, inputData);
  }
}

export function registerTensorNormalizeNode() {
  registerNodeType(TENSOR_NORMALIZE_NODE_TYPE, TensorNormalizeNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
