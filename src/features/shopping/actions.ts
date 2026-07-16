"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";
import {
  shoppingListItemSchema,
  type ShoppingListItemInput,
} from "@/lib/validation";

export async function saveShoppingItemAction(
  input: ShoppingListItemInput,
): Promise<ActionResult<{ id: string }>> {
  await requireOwner("/shopping-list");
  const parsed = shoppingListItemSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the shopping item.",
    };
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { id: input.id ?? "sl-1" } };
  const client = await createClient();
  const { data, error } = await client.rpc("upsert_shopping_item", {
    p_item: parsed.data,
  });
  if (error || !data)
    return { ok: false, message: "The shopping item could not be saved." };
  revalidatePath("/shopping-list");
  return { ok: true, data: { id: String(data) } };
}

export async function toggleShoppingItemAction(
  id: string,
  completed: boolean,
): Promise<ActionResult> {
  await requireOwner("/shopping-list");
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client
    .from("shopping_list_items")
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error)
    return { ok: false, message: "The shopping item could not be updated." };
  revalidatePath("/shopping-list");
  return { ok: true, data: undefined };
}

export async function deleteShoppingItemAction(
  id: string,
): Promise<ActionResult> {
  await requireOwner("/shopping-list");
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client
    .from("shopping_list_items")
    .delete()
    .eq("id", id);
  if (error)
    return { ok: false, message: "The shopping item could not be deleted." };
  revalidatePath("/shopping-list");
  return { ok: true, data: undefined };
}

export async function clearCompletedShoppingAction(): Promise<ActionResult> {
  await requireOwner("/shopping-list");
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client
    .from("shopping_list_items")
    .delete()
    .eq("is_completed", true);
  if (error)
    return { ok: false, message: "Completed items could not be cleared." };
  revalidatePath("/shopping-list");
  return { ok: true, data: undefined };
}

export async function movePurchasedToPantryAction(
  ids: string[],
): Promise<ActionResult<{ count: number }>> {
  await requireOwner("/shopping-list");
  if (ids.length === 0)
    return { ok: false, message: "Check at least one purchased item first." };
  if (isTestAuthenticationEnabled())
    return { ok: true, data: { count: ids.length } };
  const client = await createClient();
  const { data, error } = await client.rpc(
    "move_completed_shopping_to_pantry",
    { p_item_ids: ids },
  );
  if (error)
    return {
      ok: false,
      message:
        "Purchased items were not moved. The shopping list is unchanged.",
    };
  revalidatePath("/shopping-list");
  revalidatePath("/pantry");
  revalidatePath("/dashboard");
  const count = (() => {
    if (typeof data !== "object" || data === null || Array.isArray(data))
      return ids.length;
    const moved = Number((data as Record<string, unknown>).moved);
    return Number.isFinite(moved) ? moved : ids.length;
  })();
  return { ok: true, data: { count } };
}
