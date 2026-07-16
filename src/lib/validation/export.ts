import { z } from "zod";

import { normalizeIngredientName } from "@/lib/domain/ingredients";

import {
  optionalDateSchema,
  optionalPositiveQuantitySchema,
  optionalQuantitySchema,
  optionalTrimmedString,
  timestampSchema,
  unitSchema,
  uuidSchema,
} from "./common";
import {
  RECIPE_CATEGORIES,
  RECIPE_DIFFICULTIES,
  RECIPE_STATUSES,
  recipeIngredientSchema,
  recipeStepSchema,
} from "./recipe";
import { settingsSchema } from "./settings";
import { optionalSafeExternalUrlSchema } from "./url";

const exportIngredientSchema = z
  .object({
    id: uuidSchema,
    canonicalName: z.string().trim().min(1).max(120),
    displayName: optionalTrimmedString(120),
    normalizedName: z.string().trim().min(1).max(120),
    category: z.enum([
      "produce",
      "meat",
      "seafood",
      "dairy",
      "eggs",
      "grains",
      "pasta",
      "baking",
      "spices",
      "herbs",
      "condiments",
      "oils",
      "canned_goods",
      "frozen",
      "beverages",
      "other",
    ]),
    defaultUnit: unitSchema,
    aliases: z.array(z.string().trim().min(1).max(120)).max(100).default([]),
    isStaple: z.boolean().default(false),
    notes: optionalTrimmedString(2_000),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((ingredient, context) => {
    if (
      normalizeIngredientName(ingredient.canonicalName) !==
      ingredient.normalizedName
    ) {
      context.addIssue({
        code: "custom",
        message:
          "The normalized ingredient name does not match its canonical name.",
        path: ["normalizedName"],
      });
    }
  });

const exportTagSchema = z
  .object({
    id: uuidSchema,
    name: z.string().trim().min(1).max(60),
    normalizedName: z.string().trim().min(1).max(60),
    type: z.enum(["dietary", "custom"]),
    createdAt: timestampSchema,
  })
  .strict();

const exportRecipeSchema = z
  .object({
    id: uuidSchema,
    title: z.string().trim().min(1).max(160),
    description: optionalTrimmedString(1_000),
    imagePath: optionalTrimmedString(1_024),
    category: z.enum(RECIPE_CATEGORIES),
    cuisine: optionalTrimmedString(80),
    difficulty: z.enum(RECIPE_DIFFICULTIES).nullable().optional(),
    prepMinutes: z.number().int().nonnegative().max(10_080),
    cookMinutes: z.number().int().nonnegative().max(10_080),
    restMinutes: z.number().int().nonnegative().max(10_080),
    servings: z.number().finite().positive().max(1_000),
    sourceName: optionalTrimmedString(160),
    sourceUrl: optionalSafeExternalUrlSchema,
    notes: optionalTrimmedString(20_000),
    isFavorite: z.boolean(),
    status: z.enum(RECIPE_STATUSES),
    cookedCount: z.number().int().nonnegative(),
    lastCookedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
    ingredients: z
      .array(
        recipeIngredientSchema.safeExtend({
          ingredientId: uuidSchema,
        }),
      )
      .max(200),
    steps: z.array(recipeStepSchema).max(200),
    tagIds: z.array(uuidSchema).max(100),
  })
  .strict();

const exportPantryItemSchema = z
  .object({
    id: uuidSchema,
    ingredientId: uuidSchema,
    quantity: optionalQuantitySchema,
    unit: unitSchema,
    storageLocation: z.enum([
      "fridge",
      "freezer",
      "pantry",
      "counter",
      "other",
    ]),
    expirationDate: optionalDateSchema,
    lowStock: z.boolean(),
    notes: optionalTrimmedString(1_000),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict();

const exportShoppingItemSchema = z
  .object({
    id: uuidSchema,
    ingredientId: uuidSchema.nullable(),
    customName: optionalTrimmedString(120),
    quantity: optionalPositiveQuantitySchema,
    unit: unitSchema,
    recipeId: uuidSchema.nullable(),
    isCompleted: z.boolean(),
    completedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((item, context) => {
    if (!item.ingredientId && !item.customName) {
      context.addIssue({
        code: "custom",
        message: "Shopping entries need an ingredient or custom name.",
        path: ["customName"],
      });
    }
  });

const cookingHistoryEntrySchema = z
  .object({
    id: uuidSchema,
    recipeId: uuidSchema,
    cookedAt: timestampSchema,
    servings: z.number().finite().positive().max(1_000),
    notes: optionalTrimmedString(2_000),
  })
  .strict();

/** Versioned and strict so an import can be rejected before any database write. */
export const cookbookExportSchema = z
  .object({
    schemaVersion: z.literal(1),
    product: z.literal("Nana's Recipes"),
    exportedAt: timestampSchema,
    ingredients: z.array(exportIngredientSchema).max(20_000),
    tags: z.array(exportTagSchema).max(5_000),
    recipes: z.array(exportRecipeSchema).max(10_000),
    pantryItems: z.array(exportPantryItemSchema).max(20_000),
    shoppingListItems: z.array(exportShoppingItemSchema).max(20_000),
    cookingHistory: z.array(cookingHistoryEntrySchema).max(100_000),
    settings: settingsSchema,
  })
  .strict()
  .superRefine((data, context) => {
    const addDuplicateIssues = (
      records: readonly { id: string }[],
      collection: string,
    ): Set<string> => {
      const ids = new Set<string>();
      records.forEach((record, index) => {
        const id = record.id.toLowerCase();
        if (ids.has(id)) {
          context.addIssue({
            code: "custom",
            message: "Export record IDs must be unique within each collection.",
            path: [collection, index, "id"],
          });
        }
        ids.add(id);
      });
      return ids;
    };

    const ingredientIds = addDuplicateIssues(data.ingredients, "ingredients");
    const tagIds = addDuplicateIssues(data.tags, "tags");
    const recipeIds = addDuplicateIssues(data.recipes, "recipes");
    addDuplicateIssues(data.pantryItems, "pantryItems");
    addDuplicateIssues(data.shoppingListItems, "shoppingListItems");
    addDuplicateIssues(data.cookingHistory, "cookingHistory");

    data.recipes.forEach((recipe, recipeIndex) => {
      if (
        recipe.status !== "draft" &&
        (recipe.ingredients.length === 0 || recipe.steps.length === 0)
      ) {
        context.addIssue({
          code: "custom",
          message:
            "A completed recipe needs at least one ingredient and instruction step.",
          path: ["recipes", recipeIndex],
        });
      }

      recipe.ingredients.forEach((ingredient, ingredientIndex) => {
        if (!ingredientIds.has(ingredient.ingredientId.toLowerCase())) {
          context.addIssue({
            code: "custom",
            message:
              "Recipe ingredient references an ingredient missing from this export.",
            path: [
              "recipes",
              recipeIndex,
              "ingredients",
              ingredientIndex,
              "ingredientId",
            ],
          });
        }
      });

      const recipeTagIds = new Set<string>();
      recipe.tagIds.forEach((tagId, tagIndex) => {
        const id = tagId.toLowerCase();
        if (!tagIds.has(id)) {
          context.addIssue({
            code: "custom",
            message: "Recipe tag reference is missing from this export.",
            path: ["recipes", recipeIndex, "tagIds", tagIndex],
          });
        }
        if (recipeTagIds.has(id)) {
          context.addIssue({
            code: "custom",
            message: "Recipe tag references must be unique.",
            path: ["recipes", recipeIndex, "tagIds", tagIndex],
          });
        }
        recipeTagIds.add(id);
      });
    });

    data.pantryItems.forEach((item, index) => {
      if (!ingredientIds.has(item.ingredientId.toLowerCase())) {
        context.addIssue({
          code: "custom",
          message:
            "Pantry item references an ingredient missing from this export.",
          path: ["pantryItems", index, "ingredientId"],
        });
      }
    });

    data.shoppingListItems.forEach((item, index) => {
      if (
        item.ingredientId &&
        !ingredientIds.has(item.ingredientId.toLowerCase())
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Shopping item references an ingredient missing from this export.",
          path: ["shoppingListItems", index, "ingredientId"],
        });
      }
      if (item.recipeId && !recipeIds.has(item.recipeId.toLowerCase())) {
        context.addIssue({
          code: "custom",
          message:
            "Shopping item references a recipe missing from this export.",
          path: ["shoppingListItems", index, "recipeId"],
        });
      }
      if (item.isCompleted !== Boolean(item.completedAt)) {
        context.addIssue({
          code: "custom",
          message: "Shopping completion state and timestamp must agree.",
          path: ["shoppingListItems", index, "completedAt"],
        });
      }
    });

    data.cookingHistory.forEach((entry, index) => {
      if (!recipeIds.has(entry.recipeId.toLowerCase())) {
        context.addIssue({
          code: "custom",
          message:
            "Cooking history references a recipe missing from this export.",
          path: ["cookingHistory", index, "recipeId"],
        });
      }
    });
  });

export const exportSchema = cookbookExportSchema;
export type CookbookExport = z.output<typeof cookbookExportSchema>;
