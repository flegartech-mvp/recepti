import { describe, expect, it } from "vitest";

import {
  applyManualMatchOverride,
  scoreIngredientMatch,
} from "@/lib/retailers/matching";

describe("ingredient product matching", () => {
  const ingredient = {
    id: "milk",
    canonicalName: "mleko",
    displayName: "Mleko",
    aliases: ["polnomastno mleko"],
    category: "mlečni izdelki",
  };

  it("scores aliases without treating suggestions as verified", () => {
    const score = scoreIngredientMatch(
      {
        name: "Polnomastno mleko 3,5 %",
        normalizedName: "polnomastno mleko 3 5",
        category: "Mlečni izdelki",
      },
      ingredient,
    );
    expect(score).toBeGreaterThan(0.8);
    expect(score).toBeLessThan(1);
  });

  it("applies approved and rejected manual overrides", () => {
    const suggested = { ingredientId: "wrong", confidence: 0.55 };
    expect(
      applyManualMatchOverride(suggested, {
        ingredientId: "milk",
        reviewStatus: "approved",
      }),
    ).toMatchObject({ ingredientId: "milk", confidence: 1, method: "manual" });
    expect(
      applyManualMatchOverride(suggested, {
        ingredientId: "milk",
        reviewStatus: "rejected",
      }),
    ).toBeNull();
  });
});
