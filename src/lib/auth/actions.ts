"use server";

import { redirect } from "next/navigation";

import { hasSupabaseEnvironment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  if (hasSupabaseEnvironment()) {
    const client = await createClient();
    await client.auth.signOut();
  }
  redirect("/");
}
