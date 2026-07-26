import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.describe("private cookbook authorization", () => {
  test("shows the logged-out landing page", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "signed-out");

    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "A private shared household cookbook with pantry-based recipe matching.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View demo" })).toHaveAttribute(
      "href",
      "/preview",
    );
    await expect(
      page.getByRole("button", { name: "Private cookbook sign in" }),
    ).toBeVisible();
    await expect(
      page.getByText(
        /every allowlisted Google account joins the same household cookbook/i,
      ),
    ).toBeVisible();
    await expect(page.getByText(/create account/i)).toHaveCount(0);
  });

  test("starts a top-level owner login and shows initialization errors", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "signed-out");
    await page.goto("/");

    await page
      .getByRole("button", { name: "Private cookbook sign in" })
      .click();

    await expect(page).toHaveURL(
      /\/auth\/auth-code-error\?reason=configuration$/,
    );
    await expect(
      page.getByRole("heading", { name: "Sign-in did not finish" }),
    ).toBeVisible();
  });

  test("offers an isolated interactive preview without authentication", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "signed-out");

    await page.goto("/preview");

    await expect(
      page.getByRole("heading", {
        name: "Try the kitchen, not just the recipe cards.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sample pantry" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "What can I cook?" }),
    ).toBeVisible();

    await page.getByRole("checkbox", { name: "Use Mushrooms" }).click();
    const pastaResult = page
      .getByRole("article")
      .filter({ hasText: "Creamy mushroom pasta" });
    await expect(
      pastaResult.getByText("Almost ready", { exact: true }),
    ).toBeVisible();
    await pastaResult.getByRole("button", { name: /Open Creamy/ }).click();

    await expect(
      page.getByRole("heading", { name: "Creamy mushroom pasta" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Increase servings" }).click();
    await expect(page.getByText("2.5 servings")).toBeVisible();
    await page
      .getByRole("button", { name: "Add missing to temporary list" })
      .click();
    await page.getByRole("button", { name: /Temporary list/ }).click();
    await expect(page.getByText("Mushrooms", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Back to recipe ranking" }).click();
    await page
      .getByRole("article")
      .filter({ hasText: "Creamy mushroom pasta" })
      .getByRole("button", { name: /Open Creamy/ })
      .click();
    await page.getByRole("button", { name: "Start cooking" }).click();
    await expect(
      page.getByText("Follow one clear step at a time"),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByText("Running", { exact: true })).toBeVisible();
  });

  test("keeps the interactive preview usable on mobile", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "signed-out");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/preview");

    await expect(
      page.getByRole("heading", { name: "Sample pantry" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Switch to dark mode" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Switch language to Slovenian" }),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: "Use Mushrooms" }).click();
    await page
      .getByRole("article")
      .filter({ hasText: "Creamy mushroom pasta" })
      .getByRole("button", { name: /Open Creamy/ })
      .click();
    await expect(
      page.getByRole("button", { name: "Start cooking" }),
    ).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  });

  test("redirects a logged-out visitor away from a protected page", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "signed-out");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/?\?next=%2Fdashboard$/);
    await expect(
      page.getByRole("heading", {
        name: "A private shared household cookbook with pantry-based recipe matching.",
      }),
    ).toBeVisible();
  });

  test("sends a non-owner account to the private access page", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "guest");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/private$/);
    await expect(
      page.getByRole("heading", { name: "This cookbook is private" }),
    ).toBeVisible();
    await expect(page.getByText("visitor@example.test")).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Sign out and use another account",
      }),
    ).toBeVisible();

    await page.goto("/preview");
    await expect(page).toHaveURL(/\/private$/);
  });

  test("shows the owner dashboard", async ({ context, page, baseURL }) => {
    await authenticateAs(context, baseURL, "owner");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", {
        name: "Hi, Nana",
      }),
    ).toBeVisible();
    await expect(page.getByText("What are we cooking today?")).toBeVisible();
    await expect(page.locator("[data-swirly-background]")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Cookbook overview" }),
    ).toBeVisible();
    await expect(
      page.getByText("Recipes", { exact: true }).first(),
    ).toBeVisible();
  });

  test("persists the porcelain blue theme without a hydration flash", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "owner");
    await page.goto("/settings");

    await page.getByRole("tab", { name: "Preferences" }).click();
    const porcelainTheme = page.getByRole("button", {
      name: /^Porcelain blue/,
    });
    await porcelainTheme.click();
    await expect(porcelainTheme).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.locator("html")).toHaveClass(/blue/);

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/blue/);

    await page.goto("/dashboard");
    const background = page.locator("[data-swirly-background]");
    await expect(background).toBeVisible();
    await expect(background).toHaveCSS("pointer-events", "none");

    const themeToggle = page.getByRole("button", {
      name: "Switch to dark mode",
    });
    await themeToggle.click();
    await expect(page.locator("html")).toHaveClass(/\bblue-dark\b/);
    await expect(
      page.getByRole("button", { name: "Switch to light mode" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveClass(/\bblue\b/);
  });

  test("allows only the owner to view configuration diagnostics", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "owner");
    await page.goto("/settings/diagnostics");

    await expect(
      page.getByRole("heading", { name: "Owner diagnostics" }),
    ).toBeVisible();
    await expect(page.getByText("All owner checks passed")).toBeVisible();
    await expect(page.getByText(/secret values/i)).toBeVisible();

    await authenticateAs(context, baseURL, "denied");
    await page.goto("/settings/diagnostics");
    await expect(page).toHaveURL(/\/private$/);
    await expect(
      page.getByRole("heading", { name: "This cookbook is private" }),
    ).toBeVisible();
  });
});
