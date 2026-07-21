import { describe, expect, it } from "vitest";

import { attachMakeabilityToRecipeSummaries } from "@/lib/data/recipe-makeability";
import type { AvailableIngredient, MatchableRecipe } from "@/lib/domain";
import type { RecipeSummary } from "@/types/domain";

const summary = (id: string): RecipeSummary => ({
  id,
  title: `Recipe ${id}`,
  description: null,
  imageUrl: null,
  category: "dinner",
  cuisine: null,
  difficulty: "easy",
  totalMinutes: 20,
  isFavorite: false,
  status: "published",
  cookedCount: 0,
  lastCookedAt: null,
  createdAt: "2026-07-15T12:00:00.000Z",
  updatedAt: "2026-07-15T12:00:00.000Z",
  dietaryTags: [],
  customTags: [],
});

const recipe = (id: string): MatchableRecipe => ({
  id,
  title: `Recipe ${id}`,
  ingredients: [
    {
      ingredientId: "tomato",
      canonicalName: "Tomato",
      normalizedName: "tomato",
      quantity: 2,
      unit: "piece",
    },
  ],
});

describe("recipe summary makeability", () => {
  it("omits makeability when the pantry has no active items", () => {
    const [result] = attachMakeabilityToRecipeSummaries(
      [summary("one")],
      [recipe("one")],
      [],
    );

    expect(result?.matchPercentage).toBeUndefined();
    expect(result?.missingIngredientNames).toBeUndefined();
  });

  it("reports a zero match when pantry data exists but is unrelated", () => {
    const unrelatedPantry: AvailableIngredient[] = [
      {
        ingredientId: "rice",
        canonicalName: "Rice",
        normalizedName: "rice",
        quantity: 500,
        unit: "g",
      },
    ];
    const [result] = attachMakeabilityToRecipeSummaries(
      [summary("one")],
      [recipe("one")],
      [],
      unrelatedPantry.length > 0,
    );

    expect(result?.matchPercentage).toBe(0);
    expect(result?.missingIngredientNames).toEqual(["Tomato"]);
  });

  it("uses the deterministic matcher without changing result order", () => {
    const pantry: AvailableIngredient[] = [
      {
        ingredientId: "tomato",
        canonicalName: "Tomato",
        normalizedName: "tomato",
        quantity: 3,
        unit: "piece",
      },
    ];
    const results = attachMakeabilityToRecipeSummaries(
      [summary("two"), summary("one")],
      [recipe("one"), recipe("two")],
      pantry,
    );

    expect(results.map((result) => result.id)).toEqual(["two", "one"]);
    expect(results.map((result) => result.matchPercentage)).toEqual([100, 100]);
  });
});
