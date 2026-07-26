"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  getStarterPantryItems,
  getStarterRecipes,
  STARTER_PANTRY_SLUGS,
  STARTER_RECIPE_IDS,
} from "@/data/first-use";
import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { createRecipeSchema, pantryItemSchema } from "@/lib/validation";

const starterSelectionSchema = z
  .object({
    locale: z.enum(["en", "sl"]),
    recipeIds: z.array(z.enum(STARTER_RECIPE_IDS)).max(5),
    pantrySlugs: z
      .array(z.enum(STARTER_PANTRY_SLUGS as [string, ...string[]]))
      .max(30),
  })
  .strict()
  .refine(
    (selection) =>
      selection.recipeIds.length > 0 || selection.pantrySlugs.length > 0,
    "Choose at least one starter recipe or pantry item.",
  );

interface BootstrapResult {
  recipesCreated: number;
  pantryItemsAdded: number;
  firstRecipeId: string | null;
}

export async function bootstrapPersonalCookbookAction(
  input: unknown,
): Promise<ActionResult<BootstrapResult>> {
  await requireOwner("/getting-started");

  const selection = starterSelectionSchema.safeParse(input);
  if (!selection.success) {
    return {
      ok: false,
      message:
        selection.error.issues[0]?.message ??
        "Check the starter cookbook selection.",
    };
  }

  const recipes = createRecipeSchema
    .array()
    .max(5)
    .parse(getStarterRecipes(selection.data.recipeIds, selection.data.locale));
  const pantryItems = pantryItemSchema
    .array()
    .max(30)
    .parse(getStarterPantryItems(selection.data.pantrySlugs));

  if (isTestAuthenticationEnabled()) {
    return {
      ok: true,
      data: {
        recipesCreated: recipes.length,
        pantryItemsAdded: pantryItems.length,
        firstRecipeId: recipes.length > 0 ? "r-pasta" : null,
      },
    };
  }

  const client = await createClient();
  const { data, error } = await client.rpc("bootstrap_personal_cookbook", {
    p_recipes: recipes,
    p_pantry_items: pantryItems,
  });

  if (error || typeof data !== "object" || data === null) {
    return {
      ok: false,
      message:
        error?.code === "23505"
          ? "A selected starter recipe already exists. Refresh and review your cookbook."
          : "The starter cookbook could not be created. Nothing was changed.",
    };
  }

  const result = data as Record<string, unknown>;
  const recipesCreated = Number(result.recipes_created);
  const pantryItemsAdded = Number(result.pantry_items_added);
  const firstRecipeId =
    typeof result.first_recipe_id === "string" ? result.first_recipe_id : null;

  if (
    !Number.isInteger(recipesCreated) ||
    !Number.isInteger(pantryItemsAdded)
  ) {
    return {
      ok: false,
      message: "The starter cookbook returned an invalid result.",
    };
  }

  for (const path of [
    "/dashboard",
    "/recipes",
    "/pantry",
    "/ingredients",
    "/cook-with-what-i-have",
    "/getting-started",
  ]) {
    revalidatePath(path);
  }

  return {
    ok: true,
    data: { recipesCreated, pantryItemsAdded, firstRecipeId },
  };
}
