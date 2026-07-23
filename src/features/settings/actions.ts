"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/actions/result";
import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { dataAccessError } from "@/lib/errors/application-error";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema, type SettingsInput } from "@/lib/validation";

export async function saveSettingsAction(
  input: SettingsInput,
): Promise<ActionResult> {
  await requireOwner("/settings");
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check the settings.",
    };
  if (isTestAuthenticationEnabled()) return { ok: true, data: undefined };
  const client = await createClient();
  const { error } = await client.rpc("save_user_settings", {
    p_settings: parsed.data,
  });
  if (error) {
    const failure = dataAccessError("save user settings", error);
    return { ok: false, message: failure.message };
  }
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}

export async function deleteAllCookbookDataAction(
  confirmation: string,
): Promise<ActionResult<{ storageCleanupPending: boolean }>> {
  await requireOwner("/settings");
  if (confirmation !== "DELETE NANA'S RECIPES")
    return {
      ok: false,
      message: "Type DELETE NANA'S RECIPES exactly to confirm.",
    };
  if (isTestAuthenticationEnabled()) {
    return { ok: true, data: { storageCleanupPending: false } };
  }
  const client = await createClient();
  const { data, error } = await client.rpc("delete_all_cookbook_data");
  if (error)
    return {
      ok: false,
      message: "Cookbook data could not be deleted. Nothing was changed.",
    };
  const paths = (() => {
    if (typeof data !== "object" || data === null || Array.isArray(data))
      return [];
    const value = (data as Record<string, unknown>).storage_paths_to_delete;
    return Array.isArray(value)
      ? value.filter((path): path is string => typeof path === "string")
      : [];
  })();
  revalidatePath("/dashboard");
  revalidatePath("/recipes");
  revalidatePath("/pantry");
  revalidatePath("/shopping-list");
  revalidatePath("/ingredients");
  revalidatePath("/settings");
  let storageCleanupPending = false;
  if (paths.length > 0) {
    const { error: storageError } = await client.storage
      .from("recipe-images")
      .remove(paths);
    if (storageError) {
      storageCleanupPending = true;
    }
  }
  return { ok: true, data: { storageCleanupPending } };
}
