import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.beforeEach(async ({ context, baseURL }) => {
  await authenticateAs(context, baseURL, "owner");
});

test("browses and filters the fictional retailer catalogue", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(
    page.getByRole("heading", { name: "Product catalogue" }),
  ).toBeVisible();
  await expect(page.getByText("Fixture-backed catalogue")).toBeVisible();
  await page
    .getByPlaceholder("Search by product, brand, category, or EAN")
    .fill("linguine");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/q=linguine/);
  await expect(
    page.getByRole("heading", { name: "Bronasti linguine" }),
  ).toBeVisible();
});

test("opens product details with price and availability disclaimers", async ({
  page,
}) => {
  await page.goto("/products/spar-pasta");
  await expect(
    page.getByRole("heading", { name: "Bronasti linguine" }),
  ).toBeVisible();
  await expect(page.getByText("Unknown availability")).toBeVisible();
  await expect(page.getByText("Demo data")).toBeVisible();
});

test("compares matched shopping products without replacing the shopping item", async ({
  page,
}) => {
  await page.goto("/shopping-list");
  const chicken = page.locator("li").filter({ hasText: "Chicken breast" });
  await chicken.getByRole("button", { name: "Compare prices" }).click();
  await expect(
    page.getByRole("heading", { name: /Compare products for Chicken breast/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Piščančji file, družinsko pakiranje"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose" }).click();
  await expect(page.getByText("Preferred product saved")).toBeVisible();
  await expect(chicken).toContainText("Chicken breast");
});

test("keeps the catalogue usable on a common phone in dark mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/products");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(
    page.getByRole("heading", { name: "Product catalogue" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-testid="product-card"]').first(),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("color-scheme", "dark");
});

test("validates catalogue imports in the owner administration area", async ({
  page,
}) => {
  await page.goto("/settings/catalog");
  await expect(
    page.getByRole("heading", { name: "Catalogue administration" }),
  ).toBeVisible();
  await expect(page.getByText("No retailer partnership implied")).toBeVisible();
  await expect(page.getByLabel("CSV or JSON file")).toBeVisible();
});
