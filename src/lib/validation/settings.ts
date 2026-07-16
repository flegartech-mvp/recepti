import { z } from "zod";

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
  });

export const appSettingsSchema = settingsSchema;
export type SettingsInput = z.input<typeof settingsSchema>;
export type SettingsValues = z.output<typeof settingsSchema>;
