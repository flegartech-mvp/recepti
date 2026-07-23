import { describe, expect, it } from "vitest";

import {
  areUnitsCompatible,
  compareQuantities,
  convertQuantity,
  formatQuantity,
  formatScaledQuantity,
  normalizeUnit,
  parseQuantity,
  scaleQuantity,
} from "@/lib/domain/quantities";

describe("unit normalization and conversion", () => {
  it("normalizes known aliases without rewriting custom units", () => {
    expect(normalizeUnit(" Tablespoons. ")).toBe("tbsp");
    expect(normalizeUnit("small jar")).toBe("small jar");
  });

  it("converts only within explicitly approved families", () => {
    expect(convertQuantity(1.25, "kg", "g")).toBe(1_250);
    expect(convertQuantity(1.5, "l", "ml")).toBe(1_500);
    expect(convertQuantity(2, "tbsp", "tsp")).toBe(6);
    expect(convertQuantity(1, "cup", "g")).toBeNull();
    expect(convertQuantity(1, "tsp", "ml")).toBeNull();
    expect(convertQuantity(1, "clove", "tsp")).toBeNull();
    expect(areUnitsCompatible("cups", "cup")).toBe(true);
  });

  it("distinguishes shortage, unknown quantity, and incompatible units", () => {
    expect(compareQuantities(500, "g", 0.75, "kg").status).toBe("sufficient");
    expect(compareQuantities(500, "g", 250, "g")).toMatchObject({
      status: "insufficient",
      deficit: 250,
      ratio: 0.5,
    });
    expect(compareQuantities(2, "piece", null, "piece").status).toBe("unknown");
    expect(compareQuantities(100, "g", 1, "piece").status).toBe("incompatible");
  });
});

describe("quantity parsing, formatting, and serving scaling", () => {
  it("parses decimal, localized decimal, mixed, and Unicode fractions", () => {
    expect(parseQuantity("1.25")).toBe(1.25);
    expect(parseQuantity("1,5")).toBe(1.5);
    expect(parseQuantity("1 1/2")).toBe(1.5);
    expect(parseQuantity("1½")).toBe(1.5);
    expect(parseQuantity("⅓")).toBeCloseTo(1 / 3);
    expect(parseQuantity("2/0")).toBeNull();
    expect(parseQuantity("a handful")).toBeNull();
  });

  it("formats safe common fractions and leaves other values as decimals", () => {
    expect(formatQuantity(1.5)).toBe("1 ½");
    expect(formatQuantity(0.333)).toBe("⅓");
    expect(formatQuantity(1.999)).toBe("2");
    expect(formatQuantity(1.27)).toBe("1.27");
    expect(formatQuantity(null)).toBe("");
  });

  it("scales only the display quantity and handles null quantities", () => {
    expect(scaleQuantity(300, 4, 6)).toBe(450);
    expect(scaleQuantity(null, 4, 6)).toBeNull();
    expect(formatScaledQuantity(1, 4, 6)).toBe("1 ½");
  });

  it("rejects invalid serving counts instead of emitting misleading values", () => {
    expect(() => scaleQuantity(100, 0, 2)).toThrow(RangeError);
    expect(() => scaleQuantity(100, 2, Number.NaN)).toThrow(RangeError);
  });
});
