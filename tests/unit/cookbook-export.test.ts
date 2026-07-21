import { describe, expect, it } from "vitest";

import { shapeCookbookExport } from "@/lib/data/cookbook-export";
import { cookbookExportSchema } from "@/lib/validation";

const ingredientId = "10000000-0000-4000-8000-000000000001";
const recipeId = "20000000-0000-4000-8000-000000000001";
const recipeIngredientId = "30000000-0000-4000-8000-000000000001";
const stepId = "40000000-0000-4000-8000-000000000001";
const tagId = "50000000-0000-4000-8000-000000000001";
const recipeTagId = "60000000-0000-4000-8000-000000000001";
const timestamp = "2026-07-15T12:00:00.000Z";

describe("database cookbook export adapter", () => {
  it("produces the strict versioned public export shape", () => {
    const payload = shapeCookbookExport({
      schema_version: 1,
      exported_at: timestamp,
      preferences: {
        theme: "system",
        default_servings: 2,
        measurement_preference: "original",
        staple_ingredient_ids: [ingredientId],
        additional_staple_names: [],
        reduce_motion: false,
      },
      ingredients: [
        {
          id: ingredientId,
          canonical_name: "Sea salt",
          display_name: "Sea salt",
          normalized_name: "sea salt",
          category: "spices",
          default_unit: "pinch",
          aliases: ["salt"],
          is_staple: true,
          notes: null,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      tags: [
        {
          id: tagId,
          name: "Quick",
          normalized_name: "quick",
          type: "custom",
          created_at: timestamp,
        },
      ],
      recipes: [
        {
          id: recipeId,
          title: "Mint pasta",
          description: null,
          image_path: null,
          category: "dinner",
          cuisine: "Mediterranean",
          difficulty: "easy",
          prep_minutes: 10,
          cook_minutes: 15,
          rest_minutes: 0,
          servings: 2,
          source_name: null,
          source_url: null,
          notes: null,
          is_favorite: true,
          status: "published",
          cooked_count: 1,
          last_cooked_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      recipe_ingredients: [
        {
          id: recipeIngredientId,
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: "1.5",
          unit: "tsp",
          display_name: "sea salt",
          preparation_note: null,
          is_optional: false,
          is_garnish: false,
          section_name: null,
          sort_order: 0,
        },
      ],
      recipe_steps: [
        {
          id: stepId,
          recipe_id: recipeId,
          instruction: "Cook gently.",
          timer_seconds: 300,
          image_path: null,
          sort_order: 0,
        },
      ],
      recipe_tags: [{ id: recipeTagId, recipe_id: recipeId, tag_id: tagId }],
      pantry_items: [],
      shopping_list_items: [],
      cooking_history: [],
    });

    const parsed = cookbookExportSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error(parsed.error.message);
    expect(parsed.data.recipes[0]?.ingredients[0]?.quantity).toBe(1.5);
    expect(parsed.data.recipes[0]?.steps[0]?.timerMinutes).toBe(5);
    expect(parsed.data.recipes[0]?.tagIds).toEqual([tagId]);
  });

  it("cannot be tricked into exporting a foreign relationship", () => {
    const payload = shapeCookbookExport({
      schema_version: 1,
      exported_at: timestamp,
      preferences: {},
      ingredients: [],
      tags: [],
      recipes: [],
      recipe_ingredients: [],
      recipe_steps: [],
      recipe_tags: [],
      pantry_items: [
        {
          id: "70000000-0000-4000-8000-000000000001",
          ingredient_id: ingredientId,
          quantity: 1,
          unit: "piece",
          storage_location: "pantry",
          expiration_date: null,
          low_stock: false,
          notes: null,
          created_at: timestamp,
          updated_at: timestamp,
        },
      ],
      shopping_list_items: [],
      cooking_history: [],
    });

    expect(cookbookExportSchema.safeParse(payload).success).toBe(false);
  });
});

describe("cookbook export version 2 contract", () => {
  it("rejects a version 2 export that omits retailer preferences", () => {
    const result = cookbookExportSchema.safeParse({
      schemaVersion: 2,
      product: "Nana's Recipes",
      exportedAt: timestamp,
      ingredients: [],
      tags: [],
      recipes: [],
      pantryItems: [],
      shoppingListItems: [],
      cookingHistory: [],
      settings: {
        theme: "system",
        defaultServings: 2,
        measurementPreference: "original",
        stapleIngredientIds: [],
        additionalStapleNames: [],
        reduceMotion: false,
      },
    });

    expect(result.success).toBe(false);
  });
});
