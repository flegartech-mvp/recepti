import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.beforeEach(async ({ context, baseURL }) => {
  await authenticateAs(context, baseURL, "owner");
});

test.setTimeout(60_000);

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

test("uses the shared localized autocomplete and safe starter quantity controls", async ({
  page,
}) => {
  await page.goto("/pantry?add=1", { waitUntil: "networkidle" });

  const dialog = page.getByRole("dialog", { name: "Add pantry item" });
  const ingredient = dialog.getByLabel("Ingredient name");
  await ingredient.fill("ces");
  const suggestions = dialog.getByRole("listbox", {
    name: "Ingredient suggestions",
  });
  await expect(
    suggestions.getByRole("option", { name: /Garlic/ }),
  ).toBeVisible();
  await ingredient.press("ArrowDown");
  await ingredient.press("ArrowUp");
  await ingredient.press("Enter");
  await expect(ingredient).toHaveValue("Garlic");
  await expect(dialog.getByLabel("Unit")).toHaveValue("clove");
  await dialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByLabel("Search pantry").fill("Cheese");
  const cheese = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Cheese", exact: true }),
  });
  await expect(cheese).toContainText("0 g");
  await expect(
    cheese.getByRole("button", { name: "Decrease Cheese" }),
  ).toBeDisabled();
  await cheese.getByRole("button", { name: "Increase Cheese" }).click();
  await expect(
    page.getByText("Quantity updated", { exact: true }),
  ).toBeVisible();
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

  // A cold Turbopack compile for the detail route can exceed Playwright's
  // default five-second assertion window under the parallel browser suite.
  await expect(page).toHaveURL(/\/recipes\/r-soup$/, { timeout: 15_000 });
  await page.getByRole("button", { name: "Add missing to list" }).click();
  await expect(
    page.getByText("Missing ingredients added to the shopping list", {
      exact: true,
    }),
  ).toBeVisible();
});
