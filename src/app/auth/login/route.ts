import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/auth/redirects";
import { getOwnerEmails, hasSupabaseEnvironment } from "@/lib/env";
import { logServerError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnvironment()) {
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=configuration", request.url),
    );
  }

  try {
    getOwnerEmails();
  } catch (error) {
    logServerError("auth_owner_configuration_invalid", error);
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=configuration", request.url),
    );
  }

  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));
  const callbackUrl = new URL("/auth/callback", request.nextUrl.origin);
  callbackUrl.searchParams.set("next", nextPath);

  const client = await createClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    logServerError(
      "auth_oauth_start_failed",
      error ?? new Error("No OAuth URL"),
    );
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=oauth", request.url),
    );
  }

  return NextResponse.redirect(data.url, 302);
}
