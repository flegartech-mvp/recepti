import type { BrowserContext } from "@playwright/test";

export type TestAuthenticationRole = "signed-out" | "owner" | "denied";

export async function authenticateAs(
  context: BrowserContext,
  baseURL: string | undefined,
  role: TestAuthenticationRole,
) {
  if (!baseURL)
    throw new Error("Playwright baseURL is required for the auth fixture.");

  await context.clearCookies();
  if (role === "signed-out") return;

  const origin = new URL(baseURL).origin;
  await context.addCookies([
    {
      name: "nanas-recipes-e2e-role",
      value: role,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
      secure: origin.startsWith("https://"),
    },
  ]);
}
