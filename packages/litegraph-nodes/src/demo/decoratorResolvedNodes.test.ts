import { describe, expect, test } from "vitest";

import { LGraph } from "@mlui/litegraph";

import { HyperparametersNode } from "./HyperparametersNode";
import { MLModelNode } from "./MLModelNode";
import { MLModelRunNode } from "./MLModelRunNode";
import { OrchestratorGlobalsNode } from "./OrchestratorGlobalsNode";
import { OrchestratorVaeNode } from "./OrchestratorVaeNode";
import { TensorNormalizeNode } from "./TensorNormalizeNode";
import { TensorSourceNode } from "./TensorSourceNode";
import { VaeClassNode } from "./VaeClassNode";
import { VaeEncodeNode } from "./VaeEncodeNode";

describe("decorator-resolved demo nodes", () => {
  test("instantiate with resolved ports instead of hardcoded slots", () => {
    const source = new TensorSourceNode();
    const normalize = new TensorNormalizeNode();
    const hyperparameters = new HyperparametersNode();
    const vae = new VaeClassNode();
    const encode = new VaeEncodeNode();
    const orch1 = new OrchestratorGlobalsNode();
    const orch2 = new OrchestratorVaeNode();
    const model = new MLModelNode();
    const runModel = new MLModelRunNode();

    expect(source.inputs).toHaveLength(0);
    expect(source.outputs).toHaveLength(1);
    expect(source.outputs[0].name).toBe("tensor");
    expect(source.outputs[0].type).toBe('Tensor(Float32, Shape("batch", "channels", "height", "width"))');

    expect(normalize.inputs).toHaveLength(1);
    expect(normalize.outputs).toHaveLength(1);
    expect(normalize.inputs[0].name).toBe("tensor");
    expect(normalize.inputs[0].type).toBe('Tensor(Float32, Shape("batch", "channels", "height", "width"))');

    expect(hyperparameters.inputs).toHaveLength(0);
    expect(hyperparameters.outputs).toHaveLength(0);
    expect(hyperparameters.resolvedEntryDefinition?.globalOutputs[0].name).toBe("scaling_factor");
    expect(hyperparameters.widgets?.[0].value).toBe(0.18215);

    expect(vae.inputs.map((input) => input.name)).toEqual([
      "in_channels",
      "hidden_channels",
      "latent_channels",
      "scaling_factor",
    ]);
    expect(vae.inputs.map((input) => input.type)).toEqual(["Int", "Int", "Int", "Float32"]);
    expect(vae.outputs[0].name).toBe("self");
    expect(vae.outputs[0].type).toBe("Class(ExplicitVAE)");
    expect(vae.outputs[1].name).toBe("chain");
    expect(vae.outputs[1].type).toBe("ClassChain(ExplicitVAE)");
    expect(vae.resolvedEntryDefinition?.fields.map((field) => field.name)).toContain("scaling_factor");
    expect(vae.widgets?.some((widget) => widget.name === "scaling_factor")).not.toBe(true);

    expect(encode.inputs[0].name).toBe("self");
    expect(encode.inputs[0].type).toBe("Class(ExplicitVAE)");
    expect(encode.inputs).toHaveLength(1);
    expect(encode.outputs).toHaveLength(0);
    expect(encode.resolvedEntryDefinition?.inputs.map((input) => input.name)).toEqual([
      "self",
      "image",
    ]);

    expect(vae.resolvedEntryKind).toBe("class");
    expect(encode.resolvedEntryKind).toBe("class-method");
    expect(runModel.resolvedEntryKind).toBe("function");
    expect(orch1.outputs.map((output) => output.type)).toEqual(["OrchestratorChain"]);
    expect(orch2.inputs.map((input) => input.type)).toEqual([
      "OrchestratorChain",
      "ClassChain(ExplicitVAE)",
    ]);
    expect(model.inputs.map((input) => input.type)).toEqual(["OrchestratorChain"]);
    expect(model.outputs.map((output) => output.type)).toEqual(["MLModel"]);
    expect(runModel.inputs.map((input) => input.name)).toEqual(["model", "image"]);
    expect(runModel.inputs[0].type).toBe("MLModel");
  });

  test("connects through LiteGraph using the resolved parametric types", () => {
    const graph = new LGraph();
    const source = new TensorSourceNode();
    const hyperparameters = new HyperparametersNode();
    const normalize = new TensorNormalizeNode();

    graph.add(source);
    graph.add(hyperparameters);
    graph.add(normalize);

    const link = source.connect(0, normalize, 0);

    expect(link).toBeTruthy();
    expect(normalize.inputs[0].link).not.toBeNull();
  });

  test("rebuilds ports when leaving code mode after editing", () => {
    const normalize = new TensorNormalizeNode();

    normalize.setCodeMode(true);
    normalize.updateCode([
      "@entry(",
      "    input_values=List(Float32),",
      "    output_values=List(Float32),",
      ")",
      "def normalize(values: List(Float32)) -> List(Float32):",
      "    return values",
    ].join("\n"));
    normalize.setCodeMode(false);

    expect(normalize.inputs).toHaveLength(1);
    expect(normalize.inputs[0].name).toBe("values");
    expect(normalize.inputs[0].type).toBe("List(Float32)");
    expect(normalize.outputs[0].type).toBe("List(Float32)");
  });

  test("does not show malformed decorator errors while editing until returning to node mode", () => {
    const normalize = new TensorNormalizeNode();

    normalize.setCodeMode(true);
    normalize.updateCode("@entry(input_values=List(Float32)\ndef broken(values: List(Float32)) -> List(Float32):\n    return values");

    expect(normalize.has_errors).not.toBe(true);

    normalize.setCodeMode(false);

    expect(normalize.has_errors).toBe(true);
    expect(normalize.properties.entryError).toBeDefined();
  });
});
