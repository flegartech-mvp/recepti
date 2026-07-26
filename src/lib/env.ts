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

export function parseOwnerEmails(ownerEmails?: string): readonly string[] {
  const supplied = ownerEmails === undefined ? [] : ownerEmails.split(",");
  if (ownerEmails !== undefined && supplied.some((email) => !email.trim())) {
    throw new Error(
      "OWNER_EMAILS must contain only non-empty comma-separated email addresses.",
    );
  }

  if (supplied.length === 0) {
    throw new Error("OWNER_EMAILS is required for owner-only authorization.");
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
  return parseOwnerEmails(process.env.OWNER_EMAILS);
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
