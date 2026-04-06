import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const VAE_ROUNDTRIP_NODE_TYPE = "mlui/vae-roundtrip";

export class VaeRoundtripNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "VAE Roundtrip",
      type: VAE_ROUNDTRIP_NODE_TYPE,
      entryKind: "function",
      code: [
        "@entry(",
        "    input_vae=Class(ExplicitVAE),",
        '    input_image=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        '    output_image=Tensor(Float32, Shape("batch", "channels", "height", "width")),',
        ")",
        'def vae_roundtrip(vae: Class(ExplicitVAE), image: Tensor(Float32, Shape("batch", "channels", "height", "width"))) -> Tensor(Float32, Shape("batch", "channels", "height", "width")):',
        "    latent = vae.encode(image)",
        "    return vae.decode(latent)",
      ].join("\n"),
      normalSize: [300, 150],
    });

    this.pos = [720, 120];
  }
}

export function registerVaeRoundtripNode() {
  registerNodeType(VAE_ROUNDTRIP_NODE_TYPE, VaeRoundtripNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
