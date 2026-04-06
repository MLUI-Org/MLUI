import { describe, expect, test } from "vitest";

import { LGraph } from "@mlui/litegraph";

import { ImportsNode } from "../demo/ImportsNode";
import { MLModelNode } from "../demo/MLModelNode";
import { MLModelRunNode } from "../demo/MLModelRunNode";
import { OrchestratorGlobalsNode } from "../demo/OrchestratorGlobalsNode";
import { OrchestratorVaeNode } from "../demo/OrchestratorVaeNode";
import { TensorSourceNode } from "../demo/TensorSourceNode";
import { VaeClassNode } from "../demo/VaeClassNode";
import { VaeDecodeNode } from "../demo/VaeDecodeNode";
import { VaeEncodeNode } from "../demo/VaeEncodeNode";
import { compileWorkflowToPython } from "./compileWorkflow";

describe("compileWorkflowToPython", () => {
  test("stitches imports, hyperparameters, classes, and graph execution", () => {
    const graph = new LGraph();
    const imports = new ImportsNode();
    const source = new TensorSourceNode();
    const vae = new VaeClassNode();
    const encode = new VaeEncodeNode();
    const decode = new VaeDecodeNode();
    const orch1 = new OrchestratorGlobalsNode();
    const orch2 = new OrchestratorVaeNode();
    const model = new MLModelNode();
    const runModel = new MLModelRunNode();

    graph.add(imports);
    graph.add(source);
    graph.add(vae);
    graph.add(encode);
    graph.add(decode);
    graph.add(orch1);
    graph.add(orch2);
    graph.add(model);
    graph.add(runModel);

    vae.connect(0, encode, 0);
    vae.connect(0, decode, 0);
    orch1.connect(0, orch2, 0);
    vae.connect(1, orch2, 1);
    orch2.connect(0, model, 0);
    model.connect(0, runModel, 0);
    source.connect(0, runModel, 1);

    const result = compileWorkflowToPython(graph);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.python).not.toContain("AutoencoderKL");
    expect(result.python).not.toContain("from diffusers");
    expect(result.python).toContain("class ExplicitVAE(nn.Module):");
    expect(result.python).toContain("nn.Conv2d");
    expect(result.python).toContain(".scaling_factor)");
    expect(result.python).toContain("scaling_factor = 0.18215");
    expect(result.python).toContain("latent_scale = scaling_factor");
    expect(result.python).toContain("self.vae = ExplicitVAE(scaling_factor=latent_scale)");
    expect(result.python).not.toMatch(/value_\d+_explicit_vae = ExplicitVAE/);
    expect(result.python).toContain("def encode(self: Class(ExplicitVAE)");
    expect(result.python).toContain("def decode(self: Class(ExplicitVAE)");
    expect(result.python).not.toContain("def encode_latent");
    expect(result.python).not.toContain("def decode_latent");
    expect(result.python).not.toMatch(/def encode[^\n]*scaling_factor/);
    expect(result.python).not.toMatch(/def decode[^\n]*scaling_factor/);
    expect(result.python).toContain("class ML_Model");
    expect(result.python).toContain("def run_model(model: MLModel");
    expect(result.python).toContain("latent = model.vae.encode(image)");
    expect(result.python).toContain("return model.vae.decode(latent)");
    expect(result.python).toContain("run_model(");
    expect(result.python).not.toMatch(/value_\d+_latent = .*\.encode/);
    expect(result.python).toContain('if __name__ == "__main__":');
  });
});
