import { z } from "zod";

import {
  optionalDateSchema,
  optionalQuantitySchema,
  optionalTrimmedString,
  unitSchema,
  uuidSchema,
} from "./common";

export const STORAGE_LOCATIONS = [
  "fridge",
  "freezer",
  "pantry",
  "counter",
  "other",
] as const;

export const pantryItemSchema = z
  .object({
    id: uuidSchema.optional(),
    ingredientId: uuidSchema.nullable().optional(),
    ingredientName: optionalTrimmedString(120),
    quantity: optionalQuantitySchema.default(null),
    unit: unitSchema,
    expirationDate: optionalDateSchema,
    storageLocation: z.enum(STORAGE_LOCATIONS).default("pantry"),
    notes: optionalTrimmedString(1_000),
    lowStock: z.boolean().default(false),
    isDepleted: z.boolean().default(false),
  })
  .strict()
  .superRefine((item, context) => {
    if (!item.ingredientId && !item.ingredientName) {
      context.addIssue({
        code: "custom",
        message: "Choose or name an ingredient.",
        path: ["ingredientName"],
      });
    }
  });

export const pantryItemFormSchema = pantryItemSchema;
export type PantryItemInput = z.input<typeof pantryItemSchema>;
export type PantryItemValues = z.output<typeof pantryItemSchema>;
