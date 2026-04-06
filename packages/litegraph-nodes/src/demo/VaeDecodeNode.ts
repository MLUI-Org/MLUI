import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const VAE_DECODE_NODE_TYPE = "mlui/vae-decode";

export class VaeDecodeNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "VAE Decode",
      type: VAE_DECODE_NODE_TYPE,
      entryKind: "class-method",
      ownerClassName: "ExplicitVAE",
      code: [
        "@entry(",
        "    input_self=Class(ExplicitVAE),",
        '    input_latent=Tensor(Float32, Shape("batch", "latent_channels", "latent_height", "latent_width")),',
        '    output_image=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        ")",
        'def decode(self: Class(ExplicitVAE), latent: Tensor(Float32, Shape("batch", "latent_channels", "latent_height", "latent_width"))) -> Tensor(Float32, Shape("batch", "channels", "height", "width")):',
        "    return self.decoder(latent / self.scaling_factor)",
      ].join("\n"),
      normalSize: [280, 150],
    });

    this.pos = [720, 300];
  }
}

export function registerVaeDecodeNode() {
  registerNodeType(VAE_DECODE_NODE_TYPE, VaeDecodeNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
