import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

const environment = vi.hoisted(() => ({
  configured: vi.fn(() => true),
  ownerEmail: vi.fn(() => "owner@example.test"),
}));

vi.mock("@/lib/env", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...original,
    getOwnerEmail: environment.ownerEmail,
    hasSupabaseEnvironment: environment.configured,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth })),
}));

import { GET as finishOAuth } from "@/app/auth/callback/route";
import { GET as startOAuth } from "@/app/auth/login/route";

beforeEach(() => {
  environment.configured.mockReturnValue(true);
  environment.ownerEmail.mockReturnValue("owner@example.test");
  auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  auth.getUser.mockResolvedValue({
    data: {
      user: {
        email: "owner@example.test",
        app_metadata: { provider: "google", providers: ["google"] },
      },
    },
    error: null,
  });
  auth.signInWithOAuth.mockResolvedValue({
    data: {
      url: "https://lfrwpxkbsnqabmhymjaa.supabase.co/auth/v1/authorize?provider=google",
    },
    error: null,
  });
});

describe("Google OAuth initiation", () => {
  it("uses the live request origin and the exact application callback", async () => {
    const response = await startOAuth(
      new NextRequest(
        "https://recepti-rho.vercel.app/auth/login?next=%2Fsettings%2Fdiagnostics",
      ),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(
      /^https:\/\/lfrwpxkbsnqabmhymjaa\.supabase\.co\/auth\/v1\/authorize/,
    );
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://recepti-rho.vercel.app/auth/callback?next=%2Fsettings%2Fdiagnostics",
      },
    });
  });

  it("rejects an external post-login destination", async () => {
    await startOAuth(
      new NextRequest(
        "https://recepti-rho.vercel.app/auth/login?next=https%3A%2F%2Fevil.example",
      ),
    );

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://recepti-rho.vercel.app/auth/callback?next=%2Fdashboard",
      },
    });
  });

  it("redirects to a visible error page when OAuth cannot start", async () => {
    auth.signInWithOAuth.mockResolvedValueOnce({
      data: { url: null },
      error: new Error("provider unavailable"),
    });

    const response = await startOAuth(
      new NextRequest("https://recepti-rho.vercel.app/auth/login"),
    );

    expect(response.headers.get("location")).toBe(
      "https://recepti-rho.vercel.app/auth/auth-code-error?reason=oauth",
    );
  });
});

describe("Google OAuth callback", () => {
  it("exchanges the PKCE code and sends the owner to the dashboard", async () => {
    const response = await finishOAuth(
      new NextRequest(
        "https://recepti-rho.vercel.app/auth/callback?code=one-time-code",
      ),
    );

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(auth.getUser).toHaveBeenCalled();
    expect(response.headers.get("location")).toBe(
      "https://recepti-rho.vercel.app/dashboard",
    );
  });

  it("sends a valid non-owner Google account to the safe preview", async () => {
    auth.getUser.mockResolvedValueOnce({
      data: {
        user: {
          email: "visitor@example.test",
          app_metadata: { provider: "google", providers: ["google"] },
        },
      },
      error: null,
    });

    const response = await finishOAuth(
      new NextRequest(
        "https://recepti-rho.vercel.app/auth/callback?code=one-time-code",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://recepti-rho.vercel.app/preview",
    );
  });

  it("does not allow an external callback destination", async () => {
    const response = await finishOAuth(
      new NextRequest(
        "https://recepti-rho.vercel.app/auth/callback?code=one-time-code&next=https%3A%2F%2Fevil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://recepti-rho.vercel.app/dashboard",
    );
  });
});
