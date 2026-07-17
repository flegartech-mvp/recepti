import { describe, expect, it } from "vitest";

import {
  isValidEan,
  normalizePackageUnit,
  normalizeSlovenianText,
  parseLocalizedDecimal,
  parsePackageText,
} from "@/lib/retailers/normalization";

describe("Slovenian retailer normalization", () => {
  it("normalizes case and spacing without stripping šumniki", () => {
    expect(normalizeSlovenianText("  ČEŠNJE   in ŽAJBELJ ")).toBe(
      "češnje in žajbelj",
    );
  });

  it("parses decimal commas, euro prices, and thousands", () => {
    expect(parseLocalizedDecimal("1,29 €")).toBe(1.29);
    expect(parseLocalizedDecimal("1.249,95")).toBe(1249.95);
    expect(parseLocalizedDecimal("ni cena")).toBeNull();
  });

  it("normalizes Slovenian piece and pack units conservatively", () => {
    expect(normalizePackageUnit("kosi")).toBe("piece");
    expect(normalizePackageUnit("pak")).toBe("pack");
    expect(normalizePackageUnit("žlica")).toBeNull();
  });

  it("parses multipacks and leaves irregular packages unknown", () => {
    expect(parsePackageText("3 x 80 g")).toMatchObject({
      quantity: 240,
      unit: "g",
      multiplier: 3,
    });
    expect(parsePackageText("mešana velikost")).toMatchObject({
      quantity: null,
      unit: null,
    });
  });

  it("validates EAN checksums", () => {
    expect(isValidEan("4006381333931")).toBe(true);
    expect(isValidEan("4006381333932")).toBe(false);
  });
});
