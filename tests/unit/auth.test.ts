import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isGoogleIdentity,
  isOwnerEmail,
  isTestAuthenticationEnabled,
  normalizeEmail,
} from "@/lib/auth/authorization";

function enableLocalTestAuthentication() {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("E2E_TEST_MODE", "1");
  vi.stubEnv("VERCEL", undefined);
  vi.stubEnv("VERCEL_ENV", undefined);
}

afterEach(() => vi.unstubAllEnvs());

describe("owner email authorization", () => {
  it("normalizes surrounding whitespace, case, and compatibility Unicode", () => {
    expect(normalizeEmail("  ＯＷＮＥＲ@ＥＸＡＭＰＬＥ．ＴＥＳＴ  ")).toBe(
      "owner@example.test",
    );
  });

  it("matches only the normalized owner email", () => {
    expect(isOwnerEmail(" Owner@Example.Test ", "owner@example.test")).toBe(
      true,
    );
    expect(isOwnerEmail("visitor@example.test", "owner@example.test")).toBe(
      false,
    );
    expect(isOwnerEmail(null, "owner@example.test")).toBe(false);
    expect(isOwnerEmail(undefined, "owner@example.test")).toBe(false);
  });
});

describe("Google identity authorization", () => {
  it("accepts a primary Google identity", () => {
    expect(
      isGoogleIdentity({
        app_metadata: { provider: "google", providers: ["google"] },
      }),
    ).toBe(true);
  });

  it("accepts a linked identity that retains Google", () => {
    expect(
      isGoogleIdentity({
        app_metadata: { provider: "email", providers: ["email", "google"] },
      }),
    ).toBe(true);
  });

  it("rejects email-password and malformed provider metadata", () => {
    expect(
      isGoogleIdentity({
        app_metadata: { provider: "email", providers: ["email"] },
      }),
    ).toBe(false);
    expect(isGoogleIdentity({ app_metadata: {} })).toBe(false);
    expect(isGoogleIdentity(null)).toBe(false);
  });
});

describe("local E2E authentication boundary", () => {
  it("is enabled only when the explicit local E2E flag is set", () => {
    enableLocalTestAuthentication();

    expect(isTestAuthenticationEnabled()).toBe(true);
  });

  it("is disabled in production", () => {
    enableLocalTestAuthentication();
    vi.stubEnv("NODE_ENV", "production");

    expect(isTestAuthenticationEnabled()).toBe(false);
  });

  it("is disabled when Vercel marks the process as deployed", () => {
    enableLocalTestAuthentication();
    vi.stubEnv("VERCEL", "1");

    expect(isTestAuthenticationEnabled()).toBe(false);
  });

  it.each(["preview", "production", "development", ""])(
    "is disabled for a defined VERCEL_ENV value (%j)",
    (vercelEnvironment) => {
      enableLocalTestAuthentication();
      vi.stubEnv("VERCEL_ENV", vercelEnvironment);

      expect(isTestAuthenticationEnabled()).toBe(false);
    },
  );

  it("is disabled when the explicit E2E flag is absent", () => {
    enableLocalTestAuthentication();
    vi.stubEnv("E2E_TEST_MODE", undefined);

    expect(isTestAuthenticationEnabled()).toBe(false);
  });
});
