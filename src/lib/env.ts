import { z } from "zod";

const publicEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
});

const retailerEnvironmentSchema = z.object({
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

export function getOwnerEmail(): string {
  const value = process.env.OWNER_EMAIL;
  if (!value) {
    throw new Error("OWNER_EMAIL is required for owner-only authorization.");
  }
  return value;
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
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
