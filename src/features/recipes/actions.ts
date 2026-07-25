"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import {
  createRecipeSchema,
  isValidUuid,
  type RecipeInput,
} from "@/lib/validation";

function invalidRecipeId(
  id: string,
): Extract<ActionResult, { ok: false }> | null {
  if (isTestAuthenticationEnabled() || isValidUuid(id)) return null;
  return { ok: false, message: "The recipe identifier is invalid." };
}

export async function createRecipeAction(
  input: RecipeInput,
): Promise<ActionResult<{ id: string }>> {
  await requireOwner("/recipes/new");
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted recipe fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { id: "r-pasta" } };

  const client = await createClient();
  const { data, error } = await client.rpc("create_recipe", {
    p_recipe: parsed.data,
  });
  if (error || !data)
    return {
      ok: false,
      message: "The recipe could not be saved. Nothing was changed.",
    };

  const id =
    typeof data === "string"
      ? data
      : String((data as Record<string, unknown>).id ?? "");
  if (!id)
    return {
      ok: false,
      message: "The recipe was saved without a usable identifier.",
    };
  revalidatePath("/recipes");
  revalidatePath("/dashboard");
  return { ok: true, data: { id } };
}

export async function updateRecipeAction(
  id: string,
  input: RecipeInput,
  expectedRevision: number,
): Promise<
  ActionResult<{
    id: string;
    revision: number;
    storageCleanupPending: boolean;
  }>
> {
  await requireOwner(`/recipes/${id}/edit`);
  const invalidId = invalidRecipeId(id);
  if (invalidId) return invalidId;
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted recipe fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
    return {
      ok: false,
      code: "RECIPE_CONFLICT",
      message:
        "This recipe version is no longer current. Your draft is still here; reload the recipe in another tab before deciding what to keep.",
    };
  }
  if (isTestAuthenticationEnabled()) {
    return {
      ok: true,
      data: {
        id,
        revision: expectedRevision + 1,
        storageCleanupPending: false,
      },
    };
  }

  const client = await createClient();
  const { data: existing, error: existingError } = await client
    .from("recipes")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    return {
      ok: false,
      message:
        "The current recipe could not be read, so no update was attempted.",
    };
  }

  const { data: updateResult, error } = await client.rpc("update_recipe_v2", {
    p_recipe_id: id,
    p_recipe: parsed.data,
    p_expected_revision: expectedRevision,
  });
  if (error) {
    if (error.code === "40001") {
      return {
        ok: false,
        code: "RECIPE_CONFLICT",
        message:
          "Someone saved a newer version of this recipe. Your draft is still here and was not overwritten.",
      };
    }
    return {
      ok: false,
      message:
        "The recipe could not be updated. Your previous version is unchanged.",
    };
  }
  const revision =
    typeof updateResult === "object" &&
    updateResult !== null &&
    !Array.isArray(updateResult)
      ? Number((updateResult as Record<string, unknown>).revision)
      : Number.NaN;
  if (!Number.isInteger(revision) || revision < 1) {
    return {
      ok: false,
      message: "The recipe update returned an invalid revision.",
    };
  }

  const oldImagePath = existing?.image_path as string | null | undefined;
  let storageCleanupPending = false;
  if (oldImagePath && oldImagePath !== parsed.data.imagePath) {
    const references = await Promise.all([
      client
        .from("recipes")
        .select("id", { count: "exact", head: true })
        .eq("image_path", oldImagePath),
      client
        .from("recipe_steps")
        .select("id", { count: "exact", head: true })
        .eq("image_path", oldImagePath),
      client
        .from("recipe_images")
        .select("id", { count: "exact", head: true })
        .eq("storage_path", oldImagePath),
    ]);
    if (references.some((reference) => reference.error)) {
      storageCleanupPending = true;
    } else if (references.every((reference) => (reference.count ?? 0) === 0)) {
      const { error: storageError } = await client.storage
        .from("recipe-images")
        .remove([oldImagePath]);
      storageCleanupPending = Boolean(storageError);
    }
  }
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/recipes");
  revalidatePath("/dashboard");
  return { ok: true, data: { id, revision, storageCleanupPending } };
}

export async function toggleFavoriteAction(
  id: string,
): Promise<ActionResult<{ favorite: boolean }>> {
  await requireOwner(`/recipes/${id}`);
  const invalidId = invalidRecipeId(id);
  if (invalidId) return invalidId;
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { favorite: true } };
  const client = await createClient();
  const { data: favorite, error } = await client.rpc("toggle_recipe_favorite", {
    p_recipe_id: id,
  });
  if (error || typeof favorite !== "boolean")
    return { ok: false, message: "Favorite status could not be changed." };
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/recipes");
  revalidatePath("/favorites");
  return { ok: true, data: { favorite } };
}

export async function markRecipeCookedAction(
  id: string,
  servings?: number,
): Promise<ActionResult> {
  await requireOwner(`/recipes/${id}`);
  const invalidId = invalidRecipeId(id);
  if (invalidId) return invalidId;
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.rpc("mark_recipe_cooked", {
    p_recipe_id: id,
    p_servings: servings,
  });
  if (error)
    return { ok: false, message: "Cooking history could not be updated." };
  revalidatePath(`/recipes/${id}`);
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function deleteRecipeAction(
  id: string,
): Promise<ActionResult<{ storageCleanupPending: boolean }>> {
  await requireOwner(`/recipes/${id}`);
  const invalidId = invalidRecipeId(id);
  if (invalidId) return invalidId;
  if (isTestAuthenticationEnabled()) {
    return { ok: true, data: { storageCleanupPending: false } };
  }
  const client = await createClient();
  const { data, error } = await client.rpc("delete_recipe_with_images", {
    p_recipe_id: id,
  });
  if (error) {
    return {
      ok: false,
      message: "The recipe could not be deleted. Nothing was changed.",
    };
  }
  const storagePaths = Array.isArray(data)
    ? data.filter(
        (path): path is string => typeof path === "string" && path.length > 0,
      )
    : [];

  const { error: storageError } =
    storagePaths.length > 0
      ? await client.storage
          .from("recipe-images")
          .remove([...new Set(storagePaths)])
      : { error: null };
  revalidatePath("/recipes");
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: { storageCleanupPending: Boolean(storageError) },
  };
}

export async function duplicateRecipeAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  await requireOwner(`/recipes/${id}`);
  const invalidId = invalidRecipeId(id);
  if (invalidId) return invalidId;
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { id: "r-pasta" } };
  const client = await createClient();
  const { data, error } = await client.rpc("duplicate_recipe", {
    p_recipe_id: id,
  });
  if (error || !data)
    return { ok: false, message: "The recipe could not be duplicated." };
  const duplicateId =
    typeof data === "string"
      ? data
      : String((data as Record<string, unknown>).id ?? "");
  revalidatePath("/recipes");
  return { ok: true, data: { id: duplicateId } };
}

export async function addRecipeToPantryAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner(`/recipes/${id}`);
  const invalidId = invalidRecipeId(id);
  if (invalidId) return invalidId;
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.rpc("add_recipe_ingredients_to_pantry", {
    p_recipe_id: id,
  });
  if (error)
    return {
      ok: false,
      message: "Recipe ingredients could not be added to the pantry.",
    };
  revalidatePath("/pantry");
  return { ok: true, data: undefined };
}

export async function addMissingToShoppingAction(
  id: string,
  ingredientIds?: string[],
): Promise<ActionResult> {
  await requireOwner(`/recipes/${id}`);
  const invalidId = invalidRecipeId(id);
  if (invalidId) return invalidId;
  if (
    ingredientIds?.some((ingredientId) => !isValidUuid(ingredientId)) &&
    !isTestAuthenticationEnabled()
  ) {
    return { ok: false, message: "An ingredient identifier is invalid." };
  }
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.rpc("add_recipe_missing_to_shopping", {
    p_recipe_id: id,
    p_ingredient_ids: ingredientIds,
  });
  if (error)
    return {
      ok: false,
      message: "Missing ingredients could not be added to the shopping list.",
    };
  revalidatePath("/shopping-list");
  return { ok: true, data: undefined };
}
