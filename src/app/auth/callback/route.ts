import { NextResponse, type NextRequest } from "next/server";

import { isGoogleIdentity, isOwnerEmail } from "@/lib/auth/authorization";
import { applicationOrigin, safeInternalPath } from "@/lib/auth/redirects";
import { getOwnerEmails } from "@/lib/env";
import { logServerError } from "@/lib/observability";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const origin = applicationOrigin(request.url);
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));
  if (!code)
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=missing-code", origin),
    );

  const client = await createClient();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    logServerError("auth_callback_exchange_failed", error);
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=exchange", origin),
    );
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError) {
    logServerError("auth_callback_session_failed", userError);
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=session", origin),
    );
  }

  let ownerEmails: readonly string[];
  try {
    ownerEmails = getOwnerEmails();
  } catch (error) {
    logServerError("auth_callback_owner_configuration_invalid", error);
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=configuration", origin),
    );
  }

  if (!user || !isGoogleIdentity(user)) {
    return NextResponse.redirect(new URL("/private", origin));
  }

  if (!isOwnerEmail(user.email, ownerEmails)) {
    return NextResponse.redirect(new URL("/private", origin));
  }

  return NextResponse.redirect(new URL(nextPath, origin));
}
