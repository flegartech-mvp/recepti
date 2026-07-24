import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const ownerEmailSchema = z
  .string()
  .transform((value) =>
    value.normalize("NFKC").trim().toLocaleLowerCase("en-US"),
  )
  .pipe(z.email());

const siteUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    ["http:", "https:"].includes(url.protocol) &&
    url.username === "" &&
    url.password === "" &&
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === ""
  );
}, "NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path.");

const retailerEnvironmentSchema = z
  .object({
    RETAILER_IMPORTS_ENABLED: z.enum(["0", "1"]).default("0"),
    RETAILER_IMAGE_IMPORT_ENABLED: z.enum(["0", "1"]).default("0"),
    RETAILER_ALLOWED_SOURCE_HOSTS: z.string().default(""),
    RETAILER_SYNC_SECRET: z.string().min(32).optional(),
    SPAR_SI_FEED_URL: z.url().startsWith("https://").optional(),
    SPAR_SI_API_KEY: z.string().min(8).optional(),
    HOFER_SI_FEED_URL: z.url().startsWith("https://").optional(),
    HOFER_SI_API_KEY: z.string().min(8).optional(),
    LIDL_SI_FEED_URL: z.url().startsWith("https://").optional(),
    LIDL_SI_API_KEY: z.string().min(8).optional(),
  })
  .superRefine((environment, context) => {
    if (
      environment.RETAILER_IMAGE_IMPORT_ENABLED === "1" &&
      environment.RETAILER_IMPORTS_ENABLED !== "1"
    ) {
      context.addIssue({
        code: "custom",
        message: "Image imports require RETAILER_IMPORTS_ENABLED=1.",
      });
    }
    if (
      environment.RETAILER_IMPORTS_ENABLED === "1" &&
      !environment.RETAILER_SYNC_SECRET
    ) {
      context.addIssue({
        code: "custom",
        message: "Enabled retailer imports require RETAILER_SYNC_SECRET.",
      });
    }
  });

export type PublicEnvironment = z.infer<typeof publicEnvironmentSchema>;

export function hasSupabaseEnvironment(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getPublicEnvironment(): PublicEnvironment {
  const parsed = publicEnvironmentSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      "Nana's Recipes is missing its Supabase configuration. Copy .env.example to .env.local and add the project URL and anon key.",
    );
  }

  return parsed.data;
}

export function parseOwnerEmails({
  ownerEmails,
  legacyOwnerEmail,
}: {
  ownerEmails?: string;
  legacyOwnerEmail?: string;
}): readonly string[] {
  const supplied = ownerEmails === undefined ? [] : ownerEmails.split(",");
  if (ownerEmails !== undefined && supplied.some((email) => !email.trim())) {
    throw new Error(
      "OWNER_EMAILS must contain only non-empty comma-separated email addresses.",
    );
  }

  if (legacyOwnerEmail?.trim()) supplied.push(legacyOwnerEmail);
  if (supplied.length === 0) {
    throw new Error(
      "OWNER_EMAILS is required for owner-only authorization. OWNER_EMAIL is supported only as a legacy fallback.",
    );
  }

  const parsed = z.array(ownerEmailSchema).min(1).max(20).safeParse(supplied);
  if (!parsed.success) {
    throw new Error(
      "OWNER_EMAILS contains an invalid owner email configuration.",
    );
  }

  return [...new Set(parsed.data)];
}

export function getOwnerEmails(): readonly string[] {
  return parseOwnerEmails({
    ownerEmails: process.env.OWNER_EMAILS,
    legacyOwnerEmail: process.env.OWNER_EMAIL,
  });
}

/** Backward-compatible helper for diagnostics that only need one safe value. */
export function getOwnerEmail(): string {
  const [ownerEmail] = getOwnerEmails();
  if (!ownerEmail) {
    throw new Error("OWNER_EMAILS is required for owner-only authorization.");
  }
  return ownerEmail;
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    const parsed = siteUrlSchema.safeParse(configured);
    if (!parsed.success)
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path.",
      );
    return new URL(parsed.data).origin;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function getRetailerEnvironment() {
  const parsed = retailerEnvironmentSchema.safeParse({
    RETAILER_IMPORTS_ENABLED: process.env.RETAILER_IMPORTS_ENABLED,
    RETAILER_IMAGE_IMPORT_ENABLED: process.env.RETAILER_IMAGE_IMPORT_ENABLED,
    RETAILER_ALLOWED_SOURCE_HOSTS: process.env.RETAILER_ALLOWED_SOURCE_HOSTS,
    RETAILER_SYNC_SECRET: process.env.RETAILER_SYNC_SECRET || undefined,
    SPAR_SI_FEED_URL: process.env.SPAR_SI_FEED_URL || undefined,
    SPAR_SI_API_KEY: process.env.SPAR_SI_API_KEY || undefined,
    HOFER_SI_FEED_URL: process.env.HOFER_SI_FEED_URL || undefined,
    HOFER_SI_API_KEY: process.env.HOFER_SI_API_KEY || undefined,
    LIDL_SI_FEED_URL: process.env.LIDL_SI_FEED_URL || undefined,
    LIDL_SI_API_KEY: process.env.LIDL_SI_API_KEY || undefined,
  });
  if (!parsed.success)
    throw new Error("Retailer feed environment configuration is invalid.");
  return {
    ...parsed.data,
    allowedSourceHosts: parsed.data.RETAILER_ALLOWED_SOURCE_HOSTS.split(",")
      .map((host) => host.trim().toLocaleLowerCase("en-US"))
      .filter(Boolean),
  };
}
