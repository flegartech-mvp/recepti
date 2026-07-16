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
        name: "A cookbook that knows what's at home.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
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
        name: "A cookbook that knows what's at home.",
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
});
