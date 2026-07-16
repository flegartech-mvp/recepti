import { z } from "zod";

import { INGREDIENT_CATEGORIES } from "@/lib/constants";

import {
  normalizedUniqueStringArray,
  optionalTrimmedString,
  uuidSchema,
} from "./common";

const categories = INGREDIENT_CATEGORIES.map((item) => item.value) as [
  (typeof INGREDIENT_CATEGORIES)[number]["value"],
  ...(typeof INGREDIENT_CATEGORIES)[number]["value"][],
];

export const ingredientSchema = z
  .object({
    id: uuidSchema.optional(),
    canonicalName: z.string().trim().min(1, "Name the ingredient.").max(120),
    displayName: optionalTrimmedString(120),
    category: z.enum(categories).default("other"),
    defaultUnit: optionalTrimmedString(40),
    aliases: normalizedUniqueStringArray(30, 120).default([]),
    isStaple: z.boolean().default(false),
    notes: optionalTrimmedString(1_000),
  })
  .strict();

export type IngredientInput = z.input<typeof ingredientSchema>;
