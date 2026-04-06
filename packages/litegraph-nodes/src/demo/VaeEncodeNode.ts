import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const VAE_ENCODE_NODE_TYPE = "mlui/vae-encode";

export class VaeEncodeNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "VAE Encode",
      type: VAE_ENCODE_NODE_TYPE,
      entryKind: "class-method",
      ownerClassName: "ExplicitVAE",
      code: [
        "@entry(",
        "    input_self=Class(ExplicitVAE),",
        '    input_image=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        '    output_latent=Tensor(Float32, Shape("batch", "latent_channels", "latent_height", "latent_width")),',
        ")",
        'def encode(self: Class(ExplicitVAE), image: Tensor(Float32, Shape("batch", "channels", "height", "width"))) -> Tensor(Float32, Shape("batch", "latent_channels", "latent_height", "latent_width")):',
        "    hidden = self.encoder(image)",
        "    mean = self.mean(hidden)",
        "    logvar = self.logvar(hidden)",
        "    std = torch.exp(0.5 * logvar)",
        "    latent = mean + torch.randn_like(std) * std",
        "    return latent * self.scaling_factor",
      ].join("\n"),
      normalSize: [280, 150],
    });

    this.pos = [400, 120];
  }
}

export function registerVaeEncodeNode() {
  registerNodeType(VAE_ENCODE_NODE_TYPE, VaeEncodeNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
