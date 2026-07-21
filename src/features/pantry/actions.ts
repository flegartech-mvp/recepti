"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { pantryItemSchema, type PantryItemInput } from "@/lib/validation";
import { getIngredientDefinition } from "@/data/pantry-starters";

export async function savePantryItemAction(
  input: PantryItemInput,
): Promise<ActionResult<{ id: string }>> {
  await requireOwner("/pantry");
  const parsed = pantryItemSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the pantry item.",
    };
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { id: input.id ?? "p-1" } };
  const client = await createClient();
  const { data, error } = await client.rpc("upsert_pantry_item", {
    p_item: parsed.data,
  });
  if (error || !data)
    return { ok: false, message: "The pantry item could not be saved." };
  revalidatePath("/pantry");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: String(data) } };
}

export async function savePantryBatchAction(
  inputs: PantryItemInput[],
): Promise<ActionResult<{ count: number }>> {
  await requireOwner("/pantry");
  const parsed = pantryItemSchema.array().min(1).max(50).safeParse(inputs);
  if (!parsed.success)
    return { ok: false, message: "Check each fast-entry pantry row." };
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { count: parsed.data.length } };
  const client = await createClient();
  const { data, error } = await client.rpc("bulk_upsert_pantry_items", {
    p_items: parsed.data,
  });
  if (error)
    return {
      ok: false,
      message: "The grocery batch was not saved. No rows were moved.",
    };
  revalidatePath("/pantry");
  revalidatePath("/dashboard");
  return {
    ok: true,
    data: { count: Array.isArray(data) ? data.length : parsed.data.length },
  };
}

export async function adjustPantryQuantityAction(
  id: string,
  delta: number,
  unit?: string | null,
): Promise<ActionResult> {
  await requireOwner("/pantry");
  if (!Number.isFinite(delta) || Math.abs(delta) > 1_000_000)
    return { ok: false, message: "That quantity change is invalid." };
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  if (id.startsWith("starter:")) {
    const definition = getIngredientDefinition(id.slice("starter:".length));
    if (!definition || delta <= 0)
      return { ok: false, message: "That pantry starter cannot be adjusted." };
    const { error } = await client.rpc("upsert_pantry_item", {
      p_item: {
        ingredientName: definition.names.en,
        quantity: delta,
        unit: unit ?? definition.defaultUnit,
        storageLocation: definition.storageLocation,
        isDepleted: false,
      },
    });
    if (error)
      return { ok: false, message: "The pantry starter could not be added." };
    revalidatePath("/pantry");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  }
  const { error } = await client.rpc("adjust_pantry_quantity", {
    p_pantry_item_id: id,
    p_delta: delta,
  });
  if (error)
    return { ok: false, message: "The pantry quantity could not be adjusted." };
  revalidatePath("/pantry");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function depletePantryItemAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner("/pantry");
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client
    .from("pantry_items")
    .update({ quantity: 0, is_depleted: true })
    .eq("id", id);
  if (error)
    return { ok: false, message: "The item could not be marked depleted." };
  revalidatePath("/pantry");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}

export async function deletePantryItemAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner("/pantry");
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.from("pantry_items").delete().eq("id", id);
  if (error)
    return { ok: false, message: "The pantry item could not be deleted." };
  revalidatePath("/pantry");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
