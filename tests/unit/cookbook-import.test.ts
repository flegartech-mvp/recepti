import { describe, expect, it } from "vitest";

import { createCookbookImportPreview } from "@/lib/data/cookbook-import";
import { cookbookExportSchema } from "@/lib/validation";

const timestamp = "2026-07-23T12:00:00.000Z";

function backup(recipes: unknown[] = []) {
  return cookbookExportSchema.parse({
    schemaVersion: 2,
    product: "Nana's Recipes",
    exportedAt: timestamp,
    ingredients: [],
    tags: [],
    recipes,
    pantryItems: [],
    shoppingListItems: [],
    cookingHistory: [],
    settings: {
      theme: "pink",
      defaultServings: 2,
      measurementPreference: "original",
      stapleIngredientIds: [],
      additionalStapleNames: [],
      reduceMotion: false,
      enabledRetailers: ["spar-si", "hofer-si", "lidl-si"],
      preferredRetailer: null,
      allowLoyaltyPrices: false,
      allowSplitBasket: false,
      preferPromotions: false,
      preferredBrands: [],
      excludedBrands: [],
    },
  });
}

function draftRecipe(
  id: string,
  title: string,
  imagePath: string | null = null,
) {
  return {
    id,
    title,
    description: null,
    imagePath,
    category: "dinner",
    cuisine: null,
    difficulty: null,
    prepMinutes: 0,
    cookMinutes: 0,
    restMinutes: 0,
    servings: 2,
    sourceName: null,
    sourceUrl: null,
    notes: null,
    isFavorite: false,
    status: "draft",
    cookedCount: 0,
    lastCookedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ingredients: [],
    steps: [],
    tagIds: [],
  };
}

describe("cookbook import preview", () => {
  it("summarizes a valid pink-theme backup without mutating it", () => {
    const payload = backup([
      draftRecipe(
        "10000000-0000-4000-8000-000000000001",
        "Rosemary pasta",
        "owner/cover.webp",
      ),
    ]);

    expect(createCookbookImportPreview(payload, [])).toMatchObject({
      schemaVersion: 2,
      recipes: 1,
      imageReferencesSkipped: 1,
      duplicateRecipeTitles: [],
    });
    expect(payload.settings.theme).toBe("pink");
  });

  it("detects case-insensitive duplicates inside the backup and cookbook", () => {
    const payload = backup([
      draftRecipe("10000000-0000-4000-8000-000000000001", "Nana's soup"),
      draftRecipe("10000000-0000-4000-8000-000000000002", " NANA'S SOUP "),
      draftRecipe("10000000-0000-4000-8000-000000000003", "Sunday cake"),
    ]);

    expect(
      createCookbookImportPreview(payload, ["sunday CAKE"])
        .duplicateRecipeTitles,
    ).toEqual(["NANA'S SOUP", "Sunday cake"]);
  });
});
