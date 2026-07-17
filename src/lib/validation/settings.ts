import { z } from "zod";

import { RETAILER_SLUGS } from "@/lib/retailers/types";

import { normalizedUniqueStringArray, uuidSchema } from "./common";

export const settingsSchema = z
  .object({
    theme: z.enum(["light", "dark", "system"]).default("system"),
    defaultServings: z.number().int().positive().max(100).default(2),
    measurementPreference: z
      .enum(["metric", "imperial", "original"])
      .default("original"),
    stapleIngredientIds: z.array(uuidSchema).max(500).default([]),
    additionalStapleNames: normalizedUniqueStringArray(100, 120).default([]),
    reduceMotion: z.boolean().default(false),
    enabledRetailers: z
      .array(z.enum(RETAILER_SLUGS))
      .max(3)
      .default([...RETAILER_SLUGS]),
    preferredRetailer: z.enum(RETAILER_SLUGS).nullable().default(null),
    allowLoyaltyPrices: z.boolean().default(false),
    allowSplitBasket: z.boolean().default(true),
    preferPromotions: z.boolean().default(true),
    preferredBrands: z
      .array(z.string().trim().min(1).max(120))
      .max(50)
      .default([]),
    excludedBrands: z
      .array(z.string().trim().min(1).max(120))
      .max(50)
      .default([]),
  })
  .strict()
  .superRefine((settings, context) => {
    const uniqueIds = new Set(
      settings.stapleIngredientIds.map((id) => id.toLowerCase()),
    );
    if (uniqueIds.size !== settings.stapleIngredientIds.length) {
      context.addIssue({
        code: "custom",
        message: "Remove duplicate staple ingredients.",
        path: ["stapleIngredientIds"],
      });
    }
    if (
      settings.preferredRetailer &&
      !settings.enabledRetailers.includes(settings.preferredRetailer)
    ) {
      context.addIssue({
        code: "custom",
        path: ["preferredRetailer"],
        message: "The preferred retailer must be enabled.",
      });
    }
  });

export const appSettingsSchema = settingsSchema;
export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsValues = z.output<typeof settingsSchema>;
