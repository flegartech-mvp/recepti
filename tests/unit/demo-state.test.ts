import { describe, expect, it } from "vitest";

import {
  addMissingIngredients,
  toggleShoppingItem,
} from "@/features/demo/demo-state";
import { demoIngredients, demoPantry, demoRecipes } from "@/lib/data/demo";
import { rankRecipes } from "@/lib/domain";

describe("interactive demo state", () => {
  const results = rankRecipes(demoRecipes, demoPantry, {
    ignoreStaples: true,
    stapleIngredients: demoIngredients.filter((item) => item.isStaple),
  });
  const soup = demoRecipes.find((recipe) => recipe.id === "r-soup")!;
  const soupMatch = results.find((result) => result.recipe.id === soup.id)!;

  it("adds missing recipe ingredients without duplicating them", () => {
    const added = addMissingIngredients([], soup, soupMatch);
    const repeated = addMissingIngredients(added, soup, soupMatch);

    expect(added.map((item) => item.ingredientName)).toEqual([
      "Vegetable broth",
      "Carrot",
      "Potato",
    ]);
    expect(repeated).toHaveLength(added.length);
    expect(repeated.every((item) => item.recipeId === soup.id)).toBe(true);
  });

  it("toggles temporary shopping items without mutating the input", () => {
    const original = addMissingIngredients([], soup, soupMatch);
    const toggled = toggleShoppingItem(original, original[0]!.id);

    expect(original[0]!.isCompleted).toBe(false);
    expect(toggled[0]!.isCompleted).toBe(true);
    expect(toggled[0]!.completedAt).not.toBeNull();
  });
});
