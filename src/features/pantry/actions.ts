"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import { pantryItemSchema, type PantryItemInput } from "@/lib/validation";

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
): Promise<ActionResult> {
  await requireOwner("/pantry");
  if (!Number.isFinite(delta) || Math.abs(delta) > 1_000_000)
    return { ok: false, message: "That quantity change is invalid." };
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { data: item, error: readError } = await client
    .from("pantry_items")
    .select("quantity")
    .eq("id", id)
    .single();
  if (readError || !item || item.quantity === null)
    return {
      ok: false,
      message: "Add a known quantity before using quick adjustment.",
    };
  const quantity = Math.max(0, Number(item.quantity) + delta);
  const { error } = await client
    .from("pantry_items")
    .update({ quantity, is_depleted: quantity === 0 })
    .eq("id", id);
  if (error)
    return { ok: false, message: "The pantry quantity could not be adjusted." };
  revalidatePath("/pantry");
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
