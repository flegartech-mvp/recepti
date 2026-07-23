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
        name: "One household's private cookbook, shared as a preview.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View demo" })).toHaveAttribute(
      "href",
      "/preview",
    );
    await expect(
      page.getByRole("button", { name: "Owner sign in" }),
    ).toBeVisible();
    await expect(
      page.getByText(/does not create a personal cookbook/i),
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

    await page.getByRole("button", { name: "Owner sign in" }).click();

    await expect(page).toHaveURL(
      /\/auth\/auth-code-error\?reason=configuration$/,
    );
    await expect(
      page.getByRole("heading", { name: "Sign-in did not finish" }),
    ).toBeVisible();
  });

  test("offers a public read-only preview without authentication", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "signed-out");

    await page.goto("/preview");

    await expect(
      page.getByRole("heading", { name: "Guest preview" }),
    ).toBeVisible();
    await expect(page.getByText("Preview only").first()).toBeVisible();
    await expect(
      page.getByText(/Private cookbook data is never shown/),
    ).toBeVisible();
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
        name: "One household's private cookbook, shared as a preview.",
      }),
    ).toBeVisible();
  });

  test("sends a non-owner account to the private access page", async ({
    context,
    page,
    baseURL,
  }) => {
    await authenticateAs(context, baseURL, "denied");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/private$/);
    await expect(
      page.getByRole("heading", { name: "This cookbook is private" }),
    ).toBeVisible();
    await expect(page.getByText("visitor@example.test")).toBeVisible();
  });

  test("shows the owner dashboard", async ({ context, page, baseURL }) => {
    await authenticateAs(context, baseURL, "owner");

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", {
        name: /Good (morning|afternoon|evening), cook\./,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Cookbook overview" }),
    ).toBeVisible();
    await expect(
      page.getByText("Recipes", { exact: true }).first(),
    ).toBeVisible();
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
