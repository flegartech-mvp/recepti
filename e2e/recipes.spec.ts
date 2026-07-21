import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.beforeEach(async ({ context, baseURL }) => {
  await authenticateAs(context, baseURL, "owner");
});

test("filters the recipe library by cuisine, dietary tag, and prep time", async ({
  page,
}) => {
  await page.goto("/recipes");

  await page.getByLabel("Cuisine").click();
  await page.getByRole("option", { name: "Italian-inspired" }).click();
  await expect(page).toHaveURL(/cuisine=Italian-inspired/);

  await page.getByLabel("Dietary tag").click();
  await page.getByRole("option", { name: "Vegetarian" }).click();
  await expect(page).toHaveURL(/dietaryTag=Vegetarian/);

  await page.getByLabel("Maximum prep time").click();
  await page.getByRole("option", { name: "10 minutes" }).click();
  await expect(page).toHaveURL(/maxPrep=10/);

  await expect(
    page.getByRole("heading", { name: "Creamy mushroom pasta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Garden vegetable soup" }),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(
    page.getByRole("heading", { name: "Garden vegetable soup" }),
  ).toBeVisible();
});

test("keeps favorites as the baseline while filtering and clearing", async ({
  page,
}) => {
  await page.goto(
    "/favorites?cuisine=Italian-inspired&dietaryTag=Vegetarian&maxPrep=10",
  );

  await expect(
    page.getByRole("heading", { name: "Creamy mushroom pasta" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Banana oat pancakes" }),
  ).not.toBeVisible();

  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page).toHaveURL(/\/favorites$/);
  await expect(
    page.getByRole("heading", { name: "Banana oat pancakes" }),
  ).toBeVisible();
});

test("shows pantry makeability in the recipe library and favorites", async ({
  page,
}) => {
  await page.goto("/recipes");
  const libraryCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Creamy mushroom pasta" }),
  });
  await expect(libraryCard.getByLabel(/% pantry match$/)).toBeVisible();

  await page.goto("/favorites");
  const favoriteCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Banana oat pancakes" }),
  });
  await expect(favoriteCard.getByLabel(/% pantry match$/)).toBeVisible();
});

test("ignores malformed recipe filter URL values", async ({ page }) => {
  const response = await page.goto(
    "/recipes?sort=unsupported&difficulty=expert&page=not-a-number&maxPrep=-5&maxTotal=NaN",
  );

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: "Recipe library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Creamy mushroom pasta" }),
  ).toBeVisible();
});

test("creates a recipe through the editor", async ({ page }) => {
  await page.goto("/recipes/new");

  await page.getByLabel("Recipe title").fill("Playwright tomato toast");
  await page.getByLabel("Ingredient name").fill("Tomato");
  await page.getByLabel("Recipe wording").fill("Two ripe tomatoes");
  await page.getByLabel("Quantity").fill("2");
  await page.getByLabel("Unit").fill("piece");
  await page
    .getByLabel("Instruction")
    .fill("Toast the bread and add sliced tomato.");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page).toHaveURL(/\/recipes\/r-pasta$/);
  await expect(
    page.getByRole("heading", { name: "Creamy mushroom pasta" }),
  ).toBeVisible();
});

test("shows inline collection errors before publishing an incomplete recipe", async ({
  page,
}) => {
  await page.goto("/recipes/new");
  await page.getByLabel("Recipe title").fill("Incomplete supper");

  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByText("Add at least one ingredient.")).toBeVisible();
  await expect(
    page.getByText("Add at least one instruction step."),
  ).toBeVisible();
});

test("warns before leaving an editor with unsaved changes", async ({
  page,
}) => {
  await page.goto("/recipes/new");
  await page.getByLabel("Recipe title").fill("Unsaved mint supper");

  let warning = "";
  page.once("dialog", async (dialog) => {
    warning = dialog.message();
    await dialog.dismiss();
  });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Recipes" })
    .click();

  expect(warning).toContain("Unsaved changes");
  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(page.getByLabel("Recipe title")).toHaveValue(
    "Unsaved mint supper",
  );
});

test("attaches validation to the original row after blank rows are removed", async ({
  page,
}) => {
  await page.goto("/recipes/new");
  await page.getByLabel("Recipe title").fill("Indexed validation supper");

  const ingredientsCard = page.locator('[data-slot="card"]').filter({
    has: page.getByRole("heading", { name: "Ingredients" }),
  });
  await ingredientsCard.getByRole("button", { name: "Add" }).click();

  const secondIngredient = page.getByRole("group", {
    name: "Ingredient 2",
  });
  await secondIngredient.getByLabel("Ingredient name").fill("Tomato");
  await secondIngredient.getByLabel("Quantity").fill("-1");
  await page.getByLabel("Instruction").fill("Slice the tomato.");
  await page.getByRole("button", { name: "Save recipe" }).click();

  await expect(page).toHaveURL(/\/recipes\/new$/);
  await expect(
    secondIngredient.getByText("Quantity must be greater than zero."),
  ).toBeVisible();
  await expect(secondIngredient.getByLabel("Quantity")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page
      .getByRole("group", { name: "Ingredient 1" })
      .getByText("Quantity must be greater than zero."),
  ).toHaveCount(0);
});

test("edits an existing recipe", async ({ page }) => {
  await page.goto("/recipes/r-pasta/edit");

  await page
    .getByLabel("Recipe title")
    .fill("Creamy mushroom pasta — E2E edit");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page).toHaveURL(/\/recipes\/r-pasta\/edit$/);
  await expect(page.getByText("Recipe updated", { exact: true })).toBeVisible();
});

test("marks a recipe as cooked", async ({ page }) => {
  await page.goto("/recipes/r-pasta");

  await page.getByRole("button", { name: "Mark as cooked" }).click();

  await expect(
    page.getByText("Added to cooking history", { exact: true }),
  ).toBeVisible();
});

test("requires confirmation before deleting a recipe", async ({ page }) => {
  await page.goto("/recipes/r-pasta");

  await page.getByRole("button", { name: "Delete", exact: true }).click();
  const confirmation = page.getByRole("alertdialog");
  await expect(
    confirmation.getByRole("heading", { name: "Delete this recipe?" }),
  ).toBeVisible();
  await confirmation.getByRole("button", { name: "Delete recipe" }).click();

  await expect(page).toHaveURL(/\/recipes$/);
  await expect(
    page.getByRole("heading", { name: "Recipe library" }),
  ).toBeVisible();
});
