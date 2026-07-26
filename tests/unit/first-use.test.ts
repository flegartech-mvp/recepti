import { describe, expect, it } from "vitest";

import {
  DEFAULT_STARTER_PANTRY_SLUGS,
  getStarterPantryItems,
  getStarterRecipes,
  STARTER_PANTRY_SLUGS,
  STARTER_RECIPE_IDS,
} from "@/data/first-use";
import { getIngredientDefinition } from "@/data/pantry-starters";
import { createRecipeSchema, pantryItemSchema } from "@/lib/validation";

describe("first-use cookbook data", () => {
  it("keeps every localized starter recipe inside the normal recipe contract", () => {
    for (const locale of ["en", "sl"] as const) {
      const recipes = getStarterRecipes(STARTER_RECIPE_IDS, locale);
      expect(createRecipeSchema.array().safeParse(recipes).success).toBe(true);
      expect(recipes).toHaveLength(3);
    }
  });

  it("builds valid pantry entries from a unique, bounded starter vocabulary", () => {
    expect(new Set(STARTER_PANTRY_SLUGS).size).toBe(
      STARTER_PANTRY_SLUGS.length,
    );
    expect(STARTER_PANTRY_SLUGS.length).toBeLessThanOrEqual(30);

    const items = getStarterPantryItems(STARTER_PANTRY_SLUGS);
    expect(pantryItemSchema.array().safeParse(items).success).toBe(true);
    expect(items.every((item) => Number(item.quantity) > 0)).toBe(true);
  });

  it("preselects everything required for the first tomato spaghetti match", () => {
    const [recipe] = createRecipeSchema
      .array()
      .parse(getStarterRecipes(["tomato-spaghetti"], "en"));
    if (!recipe) throw new Error("The tomato spaghetti starter is missing.");
    const selectedNames = new Set(
      DEFAULT_STARTER_PANTRY_SLUGS.map(
        (slug) => getIngredientDefinition(slug)?.names.en,
      ),
    );

    expect(
      recipe.ingredients.every((item) => selectedNames.has(item.canonicalName)),
    ).toBe(true);
  });
});
