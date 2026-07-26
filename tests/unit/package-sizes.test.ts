import { describe, expect, it } from "vitest";

import { getPackageSizeOptions } from "@/lib/domain/package-sizes";

describe("generic package-size planning", () => {
  it("finds low-surplus mass package combinations", () => {
    expect(
      getPackageSizeOptions({ quantity: 750, unit: "g" })[0],
    ).toMatchObject({
      packageQuantity: 250,
      packageUnit: "g",
      packageCount: 3,
      totalQuantity: 750,
      surplusQuantity: 0,
    });
  });

  it("converts kilograms and litres into safe metric base units", () => {
    expect(
      getPackageSizeOptions({ quantity: 1.2, unit: "kg" })[0],
    ).toMatchObject({
      packageCount: 5,
      packageQuantity: 250,
      packageUnit: "g",
      totalQuantity: 1250,
      totalUnit: "g",
    });
    expect(
      getPackageSizeOptions({ quantity: 1.5, unit: "l" })[0],
    ).toMatchObject({
      packageCount: 1,
      packageQuantity: 1.5,
      packageUnit: "l",
      totalQuantity: 1500,
      totalUnit: "ml",
    });
  });

  it("supports countable packages without inventing cross-unit conversions", () => {
    expect(
      getPackageSizeOptions({ quantity: 5, unit: "pieces" })[0],
    ).toMatchObject({
      packageCount: 1,
      packageQuantity: 6,
      packageUnit: "piece",
      surplusQuantity: 1,
    });
    expect(getPackageSizeOptions({ quantity: 2, unit: "cup" })).toEqual([]);
    expect(getPackageSizeOptions({ quantity: null, unit: "g" })).toEqual([]);
  });
});
