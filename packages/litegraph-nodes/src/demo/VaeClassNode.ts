import { type LGraphNode, LiteGraph } from "@mlui/litegraph";

import { DecoratorResolvedCodeNode } from "../base/DecoratorResolvedCodeNode";

export const VAE_CLASS_NODE_TYPE = "mlui/vae-class";

export class VaeClassNode extends DecoratorResolvedCodeNode {
  constructor() {
    super({
      title: "Explicit VAE",
      type: VAE_CLASS_NODE_TYPE,
      entryKind: "class",
      code: [
        "@entry(",
        "    field_in_channels=Int,",
        "    field_hidden_channels=Int,",
        "    field_latent_channels=Int,",
        "    field_scaling_factor=Float32,",
        "    output_self=Class(ExplicitVAE),",
        ")",
        "class ExplicitVAE(nn.Module):",
        "    def __init__(self, in_channels: Int = 3, hidden_channels: Int = 64, latent_channels: Int = 4, scaling_factor: Float32 = 0.18215):",
        "        super().__init__()",
        "        self.in_channels = in_channels",
        "        self.hidden_channels = hidden_channels",
        "        self.latent_channels = latent_channels",
        "        self.scaling_factor = scaling_factor",
        "        self.encoder = nn.Sequential(",
        "            nn.Conv2d(in_channels, hidden_channels, kernel_size=3, stride=2, padding=1),",
        "            nn.SiLU(),",
        "            nn.Conv2d(hidden_channels, hidden_channels, kernel_size=3, stride=2, padding=1),",
        "            nn.SiLU(),",
        "        )",
        "        self.mean = nn.Conv2d(hidden_channels, latent_channels, kernel_size=1)",
        "        self.logvar = nn.Conv2d(hidden_channels, latent_channels, kernel_size=1)",
        "        self.decoder = nn.Sequential(",
        "            nn.ConvTranspose2d(latent_channels, hidden_channels, kernel_size=4, stride=2, padding=1),",
        "            nn.SiLU(),",
        "            nn.ConvTranspose2d(hidden_channels, in_channels, kernel_size=4, stride=2, padding=1),",
        "            nn.Sigmoid(),",
        "        )",
      ].join("\n"),
      normalSize: [300, 190],
    });

    this.pos = [360, -120];
  }
}

export function registerVaeClassNode() {
  registerNodeType(VAE_CLASS_NODE_TYPE, VaeClassNode);
}

function registerNodeType(type: string, ctor: typeof LGraphNode) {
  if (LiteGraph.registered_node_types[type]) return;
  LiteGraph.registerNodeType(type, ctor);
}
