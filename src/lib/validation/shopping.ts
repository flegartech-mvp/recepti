import { z } from "zod";

import {
  optionalPositiveQuantitySchema,
  optionalTrimmedString,
  unitSchema,
  uuidSchema,
} from "./common";

export const shoppingListItemSchema = z
  .object({
    id: uuidSchema.optional(),
    ingredientId: uuidSchema.nullable().optional(),
    customName: optionalTrimmedString(120),
    quantity: optionalPositiveQuantitySchema.default(null),
    unit: unitSchema,
    recipeId: uuidSchema.nullable().optional(),
    isCompleted: z.boolean().default(false),
    completedAt: z.string().datetime({ offset: true }).nullable().optional(),
    notes: optionalTrimmedString(500),
  })
  .strict()
  .superRefine((item, context) => {
    if (!item.ingredientId && !item.customName) {
      context.addIssue({
        code: "custom",
        message: "Choose an ingredient or enter an item name.",
        path: ["customName"],
      });
    }

    if (item.isCompleted && !item.completedAt) {
      context.addIssue({
        code: "custom",
        message: "Completed items need a completion time.",
        path: ["completedAt"],
      });
    }

    if (!item.isCompleted && item.completedAt) {
      context.addIssue({
        code: "custom",
        message: "An unchecked item cannot have a completion time.",
        path: ["completedAt"],
      });
    }
  });

export const shoppingItemSchema = shoppingListItemSchema;
export type ShoppingListItemInput = z.input<typeof shoppingListItemSchema>;
export type ShoppingListItemValues = z.output<typeof shoppingListItemSchema>;
