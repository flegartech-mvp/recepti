"use server";

import { redirect } from "next/navigation";

import { getSiteUrl, hasSupabaseEnvironment } from "@/lib/env";
import { safeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function signInWithGoogle(formData: FormData) {
  if (!hasSupabaseEnvironment())
    redirect("/auth/auth-code-error?reason=configuration");

  const nextPath = safeInternalPath(
    String(formData.get("next") ?? "/dashboard"),
  );
  const client = await createClient();
  const callbackUrl = new URL("/auth/callback", getSiteUrl());
  callbackUrl.searchParams.set("next", nextPath);

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) redirect("/auth/auth-code-error?reason=oauth");
  redirect(data.url);
}

export async function signOut() {
  if (hasSupabaseEnvironment()) {
    const client = await createClient();
    await client.auth.signOut();
  }
  redirect("/");
}
