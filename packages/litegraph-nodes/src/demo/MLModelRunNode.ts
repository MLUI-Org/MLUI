import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const ML_MODEL_RUN_NODE_TYPE = "mlui/ml-model-run";

export class MLModelRunNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "Run ML Model",
      type: ML_MODEL_RUN_NODE_TYPE,
      entryKind: "function",
      code: [
        "@entry(",
        "    input_model=MLModel,",
        '    input_image=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        '    output_image=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        ")",
        'def run_model(model: MLModel, image: Tensor(Float32, Shape("batch", "channels", "height", "width"))) -> Tensor(Float32, Shape("batch", "channels", "height", "width")):',
        "    latent = model.vae.encode(image)",
        "    return model.vae.decode(latent)",
      ].join("\n"),
      normalSize: [300, 150],
    });

    this.pos = [1380, 120];
  }
}

export function registerMLModelRunNode() {
  registerNodeType(ML_MODEL_RUN_NODE_TYPE, MLModelRunNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
