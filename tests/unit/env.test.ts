import { afterEach, describe, expect, it, vi } from "vitest";

import { getOwnerEmail, getRetailerEnvironment, getSiteUrl } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("environment validation", () => {
  it("normalizes a valid server-only owner email", () => {
    vi.stubEnv("OWNER_EMAIL", " owner@example.test ");
    expect(getOwnerEmail()).toBe("owner@example.test");
  });

  it("rejects an invalid owner value", () => {
    vi.stubEnv("OWNER_EMAIL", "not-an-email");
    expect(() => getOwnerEmail()).toThrow(/OWNER_EMAIL/);
  });

  it("accepts an origin and rejects paths for the public site URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recipes.example/");
    expect(getSiteUrl()).toBe("https://recipes.example");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://recipes.example/private");
    expect(() => getSiteUrl()).toThrow(/without a path/);
  });

  it("requires a server secret before retailer imports can be enabled", () => {
    vi.stubEnv("RETAILER_IMPORTS_ENABLED", "1");
    vi.stubEnv("RETAILER_SYNC_SECRET", undefined);
    expect(() => getRetailerEnvironment()).toThrow(
      /Retailer feed environment configuration is invalid/,
    );
  });
});
