"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { normalizeIngredientName } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";
import { ingredientSchema, type IngredientInput } from "@/lib/validation";

export async function saveIngredientAction(
  input: IngredientInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireOwner("/ingredients");
  const parsed = ingredientSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the ingredient.",
    };
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { id: input.id ?? "i-mushrooms" } };
  const client = await createClient();
  const values = {
    user_id: user.id,
    canonical_name: parsed.data.canonicalName,
    display_name: parsed.data.displayName ?? parsed.data.canonicalName,
    normalized_name: normalizeIngredientName(parsed.data.canonicalName),
    category: parsed.data.category,
    default_unit: parsed.data.defaultUnit,
    aliases: parsed.data.aliases,
    is_staple: parsed.data.isStaple,
    notes: parsed.data.notes,
  };
  const request = input.id
    ? client
        .from("ingredients")
        .update(values)
        .eq("id", input.id)
        .select("id")
        .single()
    : client.from("ingredients").insert(values).select("id").single();
  const { data, error } = await request;
  if (error || !data)
    return {
      ok: false,
      message:
        error?.code === "23505"
          ? "An ingredient with that normalized name already exists."
          : "The ingredient could not be saved.",
    };
  revalidatePath("/ingredients");
  return { ok: true, data: { id: String(data.id) } };
}

export async function mergeIngredientsAction(
  sourceId: string,
  targetId: string,
): Promise<ActionResult> {
  await requireOwner("/ingredients");
  if (sourceId === targetId)
    return { ok: false, message: "Choose two different ingredients." };
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.rpc("merge_ingredients", {
    p_source_id: sourceId,
    p_target_id: targetId,
  });
  if (error)
    return {
      ok: false,
      message: "The ingredients could not be merged safely.",
    };
  revalidatePath("/ingredients");
  revalidatePath("/recipes");
  revalidatePath("/pantry");
  revalidatePath("/shopping-list");
  return { ok: true, data: undefined };
}

export async function deleteIngredientAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner("/ingredients");
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.from("ingredients").delete().eq("id", id);
  if (error)
    return {
      ok: false,
      message:
        error.code === "23503"
          ? "This ingredient is still used by recipes, pantry items, or the shopping list. Merge it instead."
          : "The ingredient could not be deleted.",
    };
  revalidatePath("/ingredients");
  return { ok: true, data: undefined };
}
