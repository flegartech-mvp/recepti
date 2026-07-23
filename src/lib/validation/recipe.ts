import { z } from "zod";

import {
  ingredientIdentityKey,
  normalizeIngredientName,
} from "@/lib/domain/ingredients";

import {
  normalizedUniqueStringArray,
  optionalPositiveQuantitySchema,
  optionalTrimmedString,
  unitSchema,
  uuidSchema,
} from "./common";
import { optionalSafeExternalUrlSchema } from "./url";

export const RECIPE_DIFFICULTIES = ["easy", "medium", "challenging"] as const;
export const RECIPE_STATUSES = ["draft", "published"] as const;
export const RECIPE_CATEGORIES = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "side",
  "drink",
  "other",
] as const;

export const recipeIngredientSchema = z
  .object({
    id: uuidSchema.optional(),
    ingredientId: uuidSchema.nullable().optional(),
    canonicalName: z
      .string()
      .trim()
      .min(1, "Choose or name an ingredient.")
      .max(120),
    displayName: optionalTrimmedString(120),
    quantity: optionalPositiveQuantitySchema.default(null),
    unit: unitSchema,
    customUnit: optionalTrimmedString(40),
    preparationNote: optionalTrimmedString(240),
    isOptional: z.boolean().default(false),
    isGarnish: z.boolean().default(false),
    sectionName: optionalTrimmedString(80),
    sortOrder: z.number().int().nonnegative().max(1_000).optional(),
  })
  .strict()
  .superRefine((ingredient, context) => {
    if (ingredient.unit === "custom" && !ingredient.customUnit) {
      context.addIssue({
        code: "custom",
        message: "Enter the custom unit.",
        path: ["customUnit"],
      });
    }
  });

export const recipeStepSchema = z
  .object({
    id: uuidSchema.optional(),
    instruction: z
      .string()
      .trim()
      .min(1, "Write the instruction step.")
      .max(4_000),
    timerMinutes: z.number().int().positive().max(1_440).nullable().optional(),
    imagePath: optionalTrimmedString(1_024),
    sortOrder: z.number().int().nonnegative().max(1_000).optional(),
  })
  .strict();

const recipeShape = {
  title: z.string().trim().min(1, "Give this recipe a title.").max(160),
  description: optionalTrimmedString(1_000),
  imagePath: optionalTrimmedString(1_024),
  category: z.enum(RECIPE_CATEGORIES).default("other"),
  cuisine: optionalTrimmedString(80),
  difficulty: z.enum(RECIPE_DIFFICULTIES).nullable().optional(),
  prepMinutes: z.number().int().nonnegative().max(10_080).default(0),
  cookMinutes: z.number().int().nonnegative().max(10_080).default(0),
  restMinutes: z.number().int().nonnegative().max(10_080).default(0),
  servings: z.number().finite().positive().max(1_000).default(2),
  dietaryTags: normalizedUniqueStringArray(30, 60).default([]),
  customTags: normalizedUniqueStringArray(50, 60).default([]),
  sourceName: optionalTrimmedString(160),
  sourceUrl: optionalSafeExternalUrlSchema,
  notes: optionalTrimmedString(20_000),
  isFavorite: z.boolean().default(false),
  status: z.enum(RECIPE_STATUSES).default("published"),
};

function validateRecipeCollections(
  data: {
    ingredients: z.infer<typeof recipeIngredientSchema>[];
  },
  context: z.RefinementCtx,
): void {
  const seen = new Map<string, number>();
  data.ingredients.forEach((ingredient, index) => {
    const key = ingredientIdentityKey({
      ingredientId: ingredient.ingredientId,
      name: ingredient.canonicalName,
      normalizedName: normalizeIngredientName(ingredient.canonicalName),
    });
    const previous = seen.get(key);
    if (previous != null) {
      context.addIssue({
        code: "custom",
        message: `This ingredient duplicates row ${previous + 1}. Combine the quantities or use a section note.`,
        path: ["ingredients", index, "canonicalName"],
      });
    } else {
      seen.set(key, index);
    }
  });
}

export const recipeSchema = z
  .object({
    ...recipeShape,
    status: z.literal("published").default("published"),
    ingredients: z
      .array(recipeIngredientSchema)
      .min(1, "Add at least one ingredient.")
      .max(200),
    steps: z
      .array(recipeStepSchema)
      .min(1, "Add at least one instruction step.")
      .max(200),
  })
  .strict()
  .superRefine(validateRecipeCollections);

export const recipeDraftSchema = z
  .object({
    ...recipeShape,
    status: z.literal("draft"),
    ingredients: z.array(recipeIngredientSchema).max(200).default([]),
    steps: z.array(recipeStepSchema).max(200).default([]),
  })
  .strict()
  .superRefine(validateRecipeCollections);

export const createRecipeSchema = z.discriminatedUnion("status", [
  recipeDraftSchema,
  recipeSchema,
]);
export const recipeFormSchema = createRecipeSchema;
export type RecipeInput = z.input<typeof createRecipeSchema>;
export type RecipeValues = z.output<typeof createRecipeSchema>;
export type RecipeFormInput = RecipeInput;
export type RecipeFormValues = RecipeValues;
