import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/auth/redirects";
import { hasSupabaseEnvironment } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnvironment()) {
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
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=oauth", request.url),
    );
  }

  return NextResponse.redirect(data.url, 302);
}
