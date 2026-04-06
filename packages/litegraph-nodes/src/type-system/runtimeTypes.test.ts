import { describe, expect, test } from "vitest";

import {
  canConnectResolvedSlotTypes,
  formatRuntimeType,
  parseRuntimeTypeExpression,
} from "./runtimeTypes";

describe("runtime type system", () => {
  test("formats parsed parametric types back to a stable string", () => {
    const type = parseRuntimeTypeExpression('Tensor(Float32, Shape("batch", 768))');

    expect(type).toBeDefined();
    expect(formatRuntimeType(type!)).toBe('Tensor(Float32, Shape("batch", 768))');
  });

  test("accepts matching parametric types and rejects incompatible ones", () => {
    expect(
      canConnectResolvedSlotTypes(
        'Tensor(Float32, Shape("batch", 768))',
        'Tensor(Float32, Shape("batch", 768))',
      ),
    ).toBe(true);

    expect(
      canConnectResolvedSlotTypes(
        'Tensor(Float32, Shape("batch", 768))',
        'Tensor(Float64, Shape("batch", 768))',
      ),
    ).toBe(false);
  });

  test("treats Optional and Any as compatible input-side abstractions", () => {
    expect(canConnectResolvedSlotTypes("Tensor(Float32)", "Optional(Tensor(Float32))")).toBe(true);
    expect(canConnectResolvedSlotTypes("Tensor(Float32)", "Any")).toBe(true);
  });
});
