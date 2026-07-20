import { NextResponse, type NextRequest } from "next/server";

import { isGoogleIdentity, isOwnerEmail } from "@/lib/auth/authorization";
import { safeInternalPath } from "@/lib/auth/redirects";
import { getOwnerEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = safeInternalPath(request.nextUrl.searchParams.get("next"));
  if (!code)
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=missing-code", request.url),
    );

  const client = await createClient();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error)
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=exchange", request.url),
    );

  const {
    data: { user },
  } = await client.auth.getUser();

  let ownerEmail: string;
  try {
    ownerEmail = getOwnerEmail();
  } catch {
    return NextResponse.redirect(
      new URL("/auth/auth-code-error?reason=configuration", request.url),
    );
  }

  if (!user || !isGoogleIdentity(user)) {
    return NextResponse.redirect(new URL("/private", request.url));
  }

  if (!isOwnerEmail(user.email, ownerEmail)) {
    return NextResponse.redirect(new URL("/preview", request.url));
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
