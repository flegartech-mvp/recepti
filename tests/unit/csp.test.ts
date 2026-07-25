import { afterEach, describe, expect, it, vi } from "vitest";

import { createContentSecurityPolicy } from "@/lib/security/csp";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("content security policy", () => {
  it("uses a nonce and only the configured Supabase origin in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://lfrwpxkbsnqabmhymjaa.supabase.co",
    );

    const policy = createContentSecurityPolicy("safe-nonce");
    const scriptDirective = policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src "));

    expect(scriptDirective).toContain("'nonce-safe-nonce'");
    expect(scriptDirective).toContain("'strict-dynamic'");
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
    expect(policy).toContain(
      "connect-src 'self' https://lfrwpxkbsnqabmhymjaa.supabase.co",
    );
    expect(policy).not.toContain("*.supabase.co");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("does not trust an invalid configured endpoint", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "javascript:alert(1)");

    const policy = createContentSecurityPolicy("nonce");

    expect(policy).not.toContain("javascript:");
  });
});
