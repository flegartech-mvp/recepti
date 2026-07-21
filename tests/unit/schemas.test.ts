import { describe, expect, it } from "vitest";

import {
  cookbookExportSchema,
  createRecipeSchema,
  pantryItemSchema,
  recipeSchema,
  settingsSchema,
  shoppingListItemSchema,
} from "@/lib/validation";

const INGREDIENT_ID = "11111111-1111-4111-8111-111111111111";

const validRecipe = {
  title: "Mushroom pasta",
  ingredients: [
    {
      ingredientId: INGREDIENT_ID,
      canonicalName: "Mushrooms",
      displayName: "mushrooms",
      quantity: "1 1/2",
      unit: "cup",
    },
  ],
  steps: [{ instruction: "Cook until tender." }],
};

describe("recipe validation", () => {
  it("parses a valid recipe and common fraction quantity", () => {
    const parsed = recipeSchema.parse(validRecipe);
    expect(parsed.ingredients[0]?.quantity).toBe(1.5);
    expect(parsed.status).toBe("published");
    expect(parsed.servings).toBe(2);
  });

  it("rejects duplicate canonical ingredient rows", () => {
    const result = recipeSchema.safeParse({
      ...validRecipe,
      ingredients: [
        validRecipe.ingredients[0],
        { ...validRecipe.ingredients[0], canonicalName: "Fungi" },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((issue) =>
          issue.message.includes("duplicates row"),
        ),
      ).toBe(true);
    }
  });

  it("rejects an unsafe source URL and invalid duration", () => {
    const result = recipeSchema.safeParse({
      ...validRecipe,
      sourceUrl: "javascript:alert(1)",
      cookMinutes: -1,
    });
    expect(result.success).toBe(false);
  });

  it("allows a titled draft without ingredients or steps", () => {
    expect(
      createRecipeSchema.safeParse({
        title: "Idea for later",
        status: "draft",
        ingredients: [],
        steps: [],
      }).success,
    ).toBe(true);
  });

  it("returns field-level collection errors for an incomplete published recipe", () => {
    const result = createRecipeSchema.safeParse({
      title: "Incomplete dinner",
      status: "published",
      ingredients: [],
      steps: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining([["ingredients"], ["steps"]]),
      );
    }
  });
});

describe("pantry and shopping validation", () => {
  it("accepts a catalog pantry item, including a known zero quantity", () => {
    const result = pantryItemSchema.safeParse({
      ingredientId: INGREDIENT_ID,
      quantity: 0,
      expirationDate: "2026-07-31",
      storageLocation: "fridge",
      isDepleted: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid calendar date, negative quantity, and nameless item", () => {
    expect(
      pantryItemSchema.safeParse({
        quantity: -1,
        expirationDate: "2026-02-30",
      }).success,
    ).toBe(false);
  });

  it("accepts a custom shopping item and validates completion consistency", () => {
    expect(
      shoppingListItemSchema.safeParse({ customName: "Paper towels" }).success,
    ).toBe(true);
    expect(
      shoppingListItemSchema.safeParse({
        customName: "Milk",
        isCompleted: true,
      }).success,
    ).toBe(false);
    expect(
      shoppingListItemSchema.safeParse({
        customName: "Milk",
        isCompleted: true,
        completedAt: "2026-07-15T12:00:00.000Z",
      }).success,
    ).toBe(true);
  });
});

describe("settings and versioned export validation", () => {
  it("applies safe settings defaults and rejects duplicate staple IDs", () => {
    expect(settingsSchema.parse({})).toMatchObject({
      theme: "system",
      defaultServings: 2,
      measurementPreference: "original",
    });
    expect(
      settingsSchema.safeParse({
        stapleIngredientIds: [INGREDIENT_ID, INGREDIENT_ID],
      }).success,
    ).toBe(false);
  });

  it("accepts a complete empty export envelope and rejects unknown versions", () => {
    const exportEnvelope = {
      schemaVersion: 1,
      product: "Nana's Recipes",
      exportedAt: "2026-07-15T12:00:00.000Z",
      ingredients: [],
      tags: [],
      recipes: [],
      pantryItems: [],
      shoppingListItems: [],
      cookingHistory: [],
      settings: {},
    };

    expect(cookbookExportSchema.safeParse(exportEnvelope).success).toBe(true);
    expect(
      cookbookExportSchema.safeParse({ ...exportEnvelope, schemaVersion: 3 })
        .success,
    ).toBe(false);
    expect(
      cookbookExportSchema.safeParse({
        ...exportEnvelope,
        schemaVersion: 2,
        settings: {
          theme: "system",
          defaultServings: 2,
          measurementPreference: "original",
          stapleIngredientIds: [],
          additionalStapleNames: [],
          reduceMotion: false,
          enabledRetailers: ["spar-si", "hofer-si", "lidl-si"],
          preferredRetailer: null,
          allowLoyaltyPrices: false,
          allowSplitBasket: true,
          preferPromotions: true,
          preferredBrands: [],
          excludedBrands: [],
        },
      }).success,
    ).toBe(true);
    expect(
      cookbookExportSchema.safeParse({ ...exportEnvelope, unexpected: "data" })
        .success,
    ).toBe(false);
  });

  it("rejects dangling relationships before an import can write data", () => {
    const result = cookbookExportSchema.safeParse({
      schemaVersion: 1,
      product: "Nana's Recipes",
      exportedAt: "2026-07-15T12:00:00.000Z",
      ingredients: [],
      tags: [],
      recipes: [],
      pantryItems: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          ingredientId: INGREDIENT_ID,
          quantity: 1,
          unit: "piece",
          storageLocation: "fridge",
          lowStock: false,
          createdAt: "2026-07-15T12:00:00.000Z",
          updatedAt: "2026-07-15T12:00:00.000Z",
        },
      ],
      shoppingListItems: [],
      cookingHistory: [],
      settings: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual([
        "pantryItems",
        0,
        "ingredientId",
      ]);
    }
  });

  it("keeps ingredient categories separate from recipe meal categories", () => {
    const exportEnvelope = {
      schemaVersion: 1,
      product: "Nana's Recipes",
      exportedAt: "2026-07-15T12:00:00.000Z",
      ingredients: [
        {
          id: INGREDIENT_ID,
          canonicalName: "Tomato",
          normalizedName: "tomato",
          category: "produce",
          createdAt: "2026-07-15T12:00:00.000Z",
          updatedAt: "2026-07-15T12:00:00.000Z",
        },
      ],
      tags: [],
      recipes: [],
      pantryItems: [],
      shoppingListItems: [],
      cookingHistory: [],
      settings: {},
    };

    expect(cookbookExportSchema.safeParse(exportEnvelope).success).toBe(true);
    expect(
      cookbookExportSchema.safeParse({
        ...exportEnvelope,
        ingredients: [
          { ...exportEnvelope.ingredients[0], category: "breakfast" },
        ],
      }).success,
    ).toBe(false);
  });
});
