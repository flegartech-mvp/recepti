import { z } from "zod";

import {
  isGoogleIdentity,
  isOwnerEmail,
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { dataAccessError } from "@/lib/errors/application-error";
import { getOwnerEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export interface DiagnosticCheck {
  id: string;
  label: string;
  passed: boolean;
  remediation: string;
}

const databaseHealthSchema = z.object({
  databaseOwnerRecognized: z.boolean(),
  requiredTablesExist: z.boolean(),
  requiredRpcsExist: z.boolean(),
  requiredMigrationsApplied: z.boolean(),
  storageBucketReady: z.boolean(),
  rlsActiveOnProtectedTables: z.boolean(),
});

const remediation = {
  auth: "Sign out, then sign in again with the configured Google owner account.",
  provider:
    "Use Google OAuth; password and other identity providers are not accepted.",
  ownerEnv:
    "Set the server-only OWNER_EMAIL variable for this environment and redeploy.",
  databaseOwner:
    "Run private.configure_owner_email(...) as a database administrator with the same normalized address as OWNER_EMAIL.",
  schema:
    "Apply the reviewed Supabase migrations in order, then rerun diagnostics.",
  storage:
    "Apply the storage migration and verify the private recipe-images bucket and owner-scoped policies.",
  agreement:
    "Make OWNER_EMAIL, the signed Google identity, and the PostgreSQL owner allowlist agree.",
} as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  fix: string,
): DiagnosticCheck {
  return { id, label, passed, remediation: passed ? "" : fix };
}

export async function getOwnerDiagnostics(): Promise<DiagnosticCheck[]> {
  const user = await requireOwner("/settings/diagnostics");

  let ownerEmail: string | null = null;
  try {
    ownerEmail = getOwnerEmail();
  } catch {
    ownerEmail = null;
  }

  const appChecks = {
    userAvailable: Boolean(user.id),
    providerPermitted: isGoogleIdentity(user),
    ownerEnvironmentConfigured: Boolean(ownerEmail),
    ownerEmailMatches: Boolean(
      ownerEmail && isOwnerEmail(user.email, ownerEmail),
    ),
  };

  if (isTestAuthenticationEnabled()) {
    return [
      check(
        "auth-user",
        "Authenticated user ID is available",
        true,
        remediation.auth,
      ),
      check(
        "auth-provider",
        "Google provider is permitted",
        true,
        remediation.provider,
      ),
      check(
        "owner-env",
        "Server owner configuration is present",
        true,
        remediation.ownerEnv,
      ),
      check(
        "owner-email",
        "Authenticated email matches owner configuration",
        true,
        remediation.agreement,
      ),
      check(
        "database-owner",
        "PostgreSQL owner allowlist recognizes this owner",
        true,
        remediation.databaseOwner,
      ),
      check(
        "tables",
        "Required database tables exist",
        true,
        remediation.schema,
      ),
      check("rpcs", "Required RPC functions exist", true, remediation.schema),
      check(
        "migrations",
        "Required migrations are applied",
        true,
        remediation.schema,
      ),
      check(
        "rls",
        "RLS is active on protected tables",
        true,
        remediation.schema,
      ),
      check(
        "storage-bucket",
        "Private recipe image bucket is configured",
        true,
        remediation.storage,
      ),
      check(
        "storage-read",
        "Owner can read the private storage namespace",
        true,
        remediation.storage,
      ),
      check(
        "configuration",
        "Application and database owner configuration agree",
        true,
        remediation.agreement,
      ),
    ];
  }

  const client = await createClient();
  const [databaseResult, storageResult] = await Promise.all([
    client.rpc("owner_health_check"),
    client.storage.from("recipe-images").list(user.id, { limit: 1 }),
  ]);

  let databaseHealth: z.infer<typeof databaseHealthSchema> | null = null;
  if (databaseResult.error) {
    dataAccessError("run owner health check", databaseResult.error);
  } else {
    const parsed = databaseHealthSchema.safeParse(databaseResult.data);
    if (parsed.success) databaseHealth = parsed.data;
    else
      console.error("[Nana's Recipes diagnostics contract failure]", {
        operation: "parse owner health check",
        category: "DATA_CORRUPT",
      });
  }

  if (storageResult.error)
    dataAccessError("check private storage access", storageResult.error);

  const databaseOwnerRecognized =
    databaseHealth?.databaseOwnerRecognized ?? false;

  return [
    check(
      "auth-user",
      "Authenticated user ID is available",
      appChecks.userAvailable,
      remediation.auth,
    ),
    check(
      "auth-provider",
      "Google provider is permitted",
      appChecks.providerPermitted,
      remediation.provider,
    ),
    check(
      "owner-env",
      "Server owner configuration is present",
      appChecks.ownerEnvironmentConfigured,
      remediation.ownerEnv,
    ),
    check(
      "owner-email",
      "Authenticated email matches owner configuration",
      appChecks.ownerEmailMatches,
      remediation.agreement,
    ),
    check(
      "database-owner",
      "PostgreSQL owner allowlist recognizes this owner",
      databaseOwnerRecognized,
      remediation.databaseOwner,
    ),
    check(
      "tables",
      "Required database tables exist",
      databaseHealth?.requiredTablesExist ?? false,
      remediation.schema,
    ),
    check(
      "rpcs",
      "Required RPC functions exist",
      databaseHealth?.requiredRpcsExist ?? false,
      remediation.schema,
    ),
    check(
      "migrations",
      "Required migrations are applied",
      databaseHealth?.requiredMigrationsApplied ?? false,
      remediation.schema,
    ),
    check(
      "rls",
      "RLS is active on protected tables",
      databaseHealth?.rlsActiveOnProtectedTables ?? false,
      remediation.schema,
    ),
    check(
      "storage-bucket",
      "Private recipe image bucket is configured",
      databaseHealth?.storageBucketReady ?? false,
      remediation.storage,
    ),
    check(
      "storage-read",
      "Owner can read the private storage namespace",
      !storageResult.error,
      remediation.storage,
    ),
    check(
      "configuration",
      "Application and database owner configuration agree",
      appChecks.ownerEmailMatches && databaseOwnerRecognized,
      remediation.agreement,
    ),
  ];
}
