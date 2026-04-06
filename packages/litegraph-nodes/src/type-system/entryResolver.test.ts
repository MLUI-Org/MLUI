import { describe, expect, test } from "vitest";

import { resolveEntryDefinition } from "./entryResolver";
import { formatRuntimeType } from "./runtimeTypes";

describe("entry resolver", () => {
  test("resolves inputs and outputs from the entry decorator", () => {
    const result = resolveEntryDefinition([
      "@entry(",
      '    input_tensor=Tensor(Float32, Shape("batch", 768)),',
      "    inputglobal_learning_rate=*learning_rate,",
      '    output_tensor=Tensor(Float32, Shape("batch", 768)),',
      ")",
      'def normalize(tensor: Tensor(Float32, Shape("batch", 768)), learning_rate: Float32) -> Tensor(Float32, Shape("batch", 768)):',
      "    return tensor",
    ].join("\n"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.definition.functionName).toBe("normalize");
    expect(result.definition.inputs.map((port) => port.name)).toEqual(["tensor"]);
    expect(formatRuntimeType(result.definition.inputs[0].type)).toBe(
      'Tensor(Float32, Shape("batch", 768))',
    );
    expect(result.definition.globalInputs).toMatchObject([
      {
        name: "learning_rate",
        sourceName: "learning_rate",
      },
    ]);
    expect(result.definition.outputs.map((port) => port.name)).toEqual(["tensor"]);
  });

  test("rejects mismatched function annotations", () => {
    const result = resolveEntryDefinition([
      "@entry(",
      "    input_value=Tensor(Float32),",
      "    output_result=Tensor(Float32),",
      ")",
      "def broken(value: Tensor(Float64)) -> Tensor(Float32):",
      "    return value",
    ].join("\n"));

    expect(result.ok).toBe(false);
    if (result.ok === true) return;

    expect(result.error).toContain('Parameter "value"');
  });

  test("resolves outputglobal declarations", () => {
    const result = resolveEntryDefinition([
      "@entry(",
      "    outputglobal_learning_rate=Float32,",
      ")",
      "def hyperparameters() -> Float32:",
      "    return 0.001",
    ].join("\n"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.definition.outputs).toHaveLength(0);
    expect(result.definition.globalOutputs.map((port) => port.name)).toEqual(["learning_rate"]);
    expect(formatRuntimeType(result.definition.globalOutputs[0].type)).toBe("Float32");
  });

  test("resolves class fields from __init__ defaults", () => {
    const result = resolveEntryDefinition([
      "@entry(",
      "    field_scaling_factor=Float32,",
      "    output_self=Class(ExplicitVAE),",
      ")",
      "class ExplicitVAE(nn.Module):",
      "    def __init__(self, scaling_factor: Float32 = 0.18215):",
      "        self.scaling_factor = scaling_factor",
    ].join("\n"), {
      kind: "class",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.definition.kind).toBe("class");
    expect(result.definition.className).toBe("ExplicitVAE");
    expect(result.definition.fields).toMatchObject([
      {
        name: "scaling_factor",
        defaultValue: "0.18215",
      },
    ]);
    expect(result.definition.outputs.map((port) => port.name)).toEqual(["self"]);
  });
});
