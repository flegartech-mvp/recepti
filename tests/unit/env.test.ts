import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getOwnerEmails,
  getPublicEnvironment,
  getRetailerEnvironment,
  getSiteUrl,
  hasSupabaseEnvironment,
  parseOwnerEmails,
} from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("environment validation", () => {
  it("normalizes, lowercases, and deduplicates the server-only owner list", () => {
    vi.stubEnv(
      "OWNER_EMAILS",
      " tini.flegar@gmail.com, FLEGARTECH@GMAIL.COM, vukovic.nadia7@gmail.com, tini.flegar@gmail.com ",
    );
    expect(getOwnerEmails()).toEqual([
      "tini.flegar@gmail.com",
      "flegartech@gmail.com",
      "vukovic.nadia7@gmail.com",
    ]);
  });

  it.each([
    undefined,
    "",
    "owner@example.test,",
    "owner@example.test,,other@example.test",
    "not-an-email",
  ])("fails closed for missing or malformed allowlists: %j", (input) => {
    expect(() => parseOwnerEmails(input)).toThrow(/OWNER_EMAILS/);
  });

  it("accepts an origin and rejects paths for the public site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recipes.example/");
    expect(getSiteUrl()).toBe("https://recipes.example");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recipes.example/private");
    expect(() => getSiteUrl()).toThrow(/without a path/);
  });

  it("fails closed when either public Supabase OAuth variable is missing", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://lfrwpxkbsnqabmhymjaa.supabase.co",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", undefined);

    expect(hasSupabaseEnvironment()).toBe(false);
    expect(() => getPublicEnvironment()).toThrow(/Supabase configuration/);
  });

  it("requires a server secret before retailer imports can be enabled", () => {
    vi.stubEnv("RETAILER_IMPORTS_ENABLED", "1");
    vi.stubEnv("RETAILER_SYNC_SECRET", undefined);
    expect(() => getRetailerEnvironment()).toThrow(
      /Retailer feed environment configuration is invalid/,
    );
  });
});
