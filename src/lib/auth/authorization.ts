import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getOwnerEmail, hasSupabaseEnvironment } from "@/lib/env";
import { ApplicationError } from "@/lib/errors/application-error";
import { createClient } from "@/lib/supabase/server";

export type AuthorizationState =
  | { status: "signed-out"; user: null; configured: boolean }
  | { status: "owner"; user: User; configured: true }
  | { status: "guest"; user: User; configured: true }
  | { status: "denied"; user: User; configured: true };

export function normalizeEmail(email: string): string {
  return email.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

export function isOwnerEmail(
  email: string | null | undefined,
  ownerEmail: string,
): boolean {
  return (
    Boolean(email) && normalizeEmail(email!) === normalizeEmail(ownerEmail)
  );
}

/**
 * Nana's Recipes deliberately accepts only identities that were authenticated through
 * Google. `providers` also covers a Supabase identity whose primary provider
 * changed after account linking while retaining a verified Google identity.
 */
export function isGoogleIdentity(
  user: Pick<User, "app_metadata"> | null | undefined,
): boolean {
  if (!user) return false;
  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;
  return (
    provider === "google" ||
    (Array.isArray(providers) && providers.includes("google"))
  );
}

export function isTestAuthenticationEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.VERCEL !== "1" &&
    typeof process.env.VERCEL_ENV === "undefined" &&
    process.env.E2E_TEST_MODE === "1"
  );
}

function testUser(role: "owner" | "guest" | "denied"): User {
  const ownerEmail = process.env.OWNER_EMAIL ?? "owner@example.test";
  const email = role === "owner" ? ownerEmail : "visitor@example.test";
  return {
    id:
      role === "owner"
        ? "00000000-0000-4000-8000-000000000001"
        : "00000000-0000-4000-8000-000000000002",
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: {
      full_name: role === "owner" ? "Nana's Recipes Owner" : "Preview Guest",
    },
    identities: [],
    created_at: new Date(0).toISOString(),
  };
}

export async function getAuthorizationState(): Promise<AuthorizationState> {
  if (isTestAuthenticationEnabled()) {
    const role = (await cookies()).get("nanas-recipes-e2e-role")?.value;
    if (role === "owner" || role === "guest" || role === "denied") {
      return {
        status: role === "owner" ? "owner" : role,
        user: testUser(role),
        configured: true,
      };
    }
    return { status: "signed-out", user: null, configured: true };
  }

  if (!hasSupabaseEnvironment()) {
    return { status: "signed-out", user: null, configured: false };
  }

  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error) {
    console.error("[Nana's Recipes auth lookup failure]", {
      operation: "load authenticated user",
      category: "AUTH_UNAVAILABLE",
      status: error.status ?? null,
    });
    throw new ApplicationError(
      "AUTH_UNAVAILABLE",
      "load authenticated user",
      "The owner session could not be verified.",
      error,
    );
  }

  if (!user) return { status: "signed-out", user: null, configured: true };

  let ownerEmail: string;
  try {
    ownerEmail = getOwnerEmail();
  } catch {
    return { status: "denied", user, configured: true };
  }

  if (!isGoogleIdentity(user)) {
    return { status: "denied", user, configured: true };
  }

  return isOwnerEmail(user.email, ownerEmail)
    ? { status: "owner", user, configured: true }
    : { status: "guest", user, configured: true };
}

export async function requireOwner(returnTo = "/dashboard"): Promise<User> {
  const state = await getAuthorizationState();
  if (state.status === "signed-out") {
    redirect(`/?next=${encodeURIComponent(returnTo)}`);
  }
  if (state.status === "guest") redirect("/preview");
  if (state.status === "denied") redirect("/private");
  return state.user;
}
