import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.beforeEach(async ({ context, baseURL }) => {
  await authenticateAs(context, baseURL, "owner");
});

test("adds an item to the pantry", async ({ page }) => {
  await page.goto("/pantry?add=1");

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Add pantry item" }),
  ).toBeVisible();
  await dialog.getByLabel("Ingredient name").fill("E2E basil");
  await dialog.getByLabel("Quantity").fill("1");
  await dialog.getByLabel("Unit").fill("bunch");
  await dialog.getByRole("button", { name: "Save item" }).click();

  await expect(
    page.getByText("Pantry item saved", { exact: true }),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
});

test("ranks matcher categories and adds missing ingredients to the shopping list", async ({
  page,
}) => {
  // The matcher is a client island. Waiting for the cold dev-server chunk keeps
  // the first typed value from racing React hydration during parallel CI runs.
  await page.goto("/cook-with-what-i-have", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { name: "Ready to cook" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Not enough ingredients" }),
  ).toBeVisible();

  await page.getByPlaceholder("Find ingredient").fill("Vegetable broth");
  await page
    .getByRole("button", { name: "Vegetable broth", exact: true })
    .click();

  await expect(
    page.getByRole("heading", { name: "Almost ready" }),
  ).toBeVisible();
  const soupMatch = page
    .getByRole("article")
    .filter({ hasText: "Garden vegetable soup" });
  await expect(soupMatch).toContainText("2 of 4 matched");
  await soupMatch.getByRole("link", { name: "View recipe" }).click();

  await expect(page).toHaveURL(/\/recipes\/r-soup$/);
  await page.getByRole("button", { name: "Add missing to list" }).click();
  await expect(
    page.getByText("Missing ingredients added to the shopping list", {
      exact: true,
    }),
  ).toBeVisible();
});
