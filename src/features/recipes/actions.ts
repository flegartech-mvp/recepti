"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { createRecipeSchema, type RecipeInput } from "@/lib/validation";

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
): Promise<ActionResult<{ id: string; storageCleanupPending: boolean }>> {
  await requireOwner(`/recipes/${id}/edit`);
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the highlighted recipe fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  if (isTestAuthenticationEnabled()) {
    return { ok: true, data: { id, storageCleanupPending: false } };
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

  const { error } = await client.rpc("update_recipe", {
    p_recipe_id: id,
    p_recipe: parsed.data,
  });
  if (error)
    return {
      ok: false,
      message:
        "The recipe could not be updated. Your previous version is unchanged.",
    };

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
  return { ok: true, data: { id, storageCleanupPending } };
}

export async function toggleFavoriteAction(
  id: string,
): Promise<ActionResult<{ favorite: boolean }>> {
  await requireOwner(`/recipes/${id}`);
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { favorite: true } };
  const client = await createClient();
  const { data: recipe, error: readError } = await client
    .from("recipes")
    .select("is_favorite")
    .eq("id", id)
    .single();
  if (readError || !recipe)
    return { ok: false, message: "Favorite status could not be read." };
  const favorite = !Boolean(recipe.is_favorite);
  const { error } = await client
    .from("recipes")
    .update({ is_favorite: favorite })
    .eq("id", id);
  if (error)
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
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.rpc("mark_recipe_cooked", {
    p_recipe_id: id,
    p_servings: servings ?? null,
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
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.rpc("add_recipe_missing_to_shopping", {
    p_recipe_id: id,
    p_ingredient_ids: ingredientIds ?? null,
  });
  if (error)
    return {
      ok: false,
      message: "Missing ingredients could not be added to the shopping list.",
    };
  revalidatePath("/shopping-list");
  return { ok: true, data: undefined };
}
