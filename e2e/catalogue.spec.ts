import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.beforeEach(async ({ context, baseURL }) => {
  await authenticateAs(context, baseURL, "owner");
});

test("searches verified products by brand and filters by retailer", async ({
  page,
}) => {
  await page.goto("/products");
  await expect(
    page.getByRole("heading", { name: "Product catalogue" }),
  ).toBeVisible();
  await expect(page.getByText("300 of 300 products")).toBeVisible();

  await page
    .getByPlaceholder("Search by product, brand, category, or EAN")
    .fill("milsani");
  await page.getByLabel("Retailer").selectOption("hofer-si");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/q=milsani&retailer=hofer-si/);
  await expect(page.getByTestId("product-card").first()).toContainText("HOFER");
  await expect(page.getByTestId("product-card").first()).toContainText(
    "MILSANI",
  );
  await expect(page.getByText(/of 300 products/)).toBeVisible();
});

test("opens a source-linked product without claiming a current price", async ({
  page,
}) => {
  await page.goto("/products/lidl-si-11008519");
  await expect(
    page.getByRole("heading", { name: "Mozzarella XXL" }),
  ).toBeVisible();
  await expect(page.getByText("Not stored", { exact: true })).toBeVisible();
  await expect(page.getByText("2026-07-20", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open official product page" }),
  ).toHaveAttribute("href", /^https:\/\/www\.lidl\.si\//);
  await expect(page.getByText(/not a live stock or price feed/i)).toBeVisible();
});

test("compares only matching shopping products without mutating the item", async ({
  page,
}) => {
  await page.goto("/shopping-list");
  const chicken = page.locator("li").filter({ hasText: "Chicken breast" });
  await chicken.getByRole("button", { name: "Compare Chicken breast" }).click();

  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", {
      name: "Catalogue options for Chicken breast",
    }),
  ).toBeVisible();
  await expect(dialog.getByText(/Piščanč/).first()).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: "Official source" }).first(),
  ).toHaveAttribute(
    "href",
    /^https:\/\/(?:www\.hofer\.si|www\.lidl\.si|online\.spar\.si)\//,
  );
  await dialog.getByRole("button", { name: "Choose" }).first().click();
  await expect(dialog.getByRole("button", { name: "Chosen" })).toBeVisible();
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
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("documents the versioned catalogue release process", async ({ page }) => {
  await page.goto("/settings/catalog");
  await expect(
    page.getByRole("heading", { name: "Catalogue administration" }),
  ).toBeVisible();
  await expect(page.getByText("src/data/retailers")).toBeVisible();
  await expect(page.getByText("pnpm catalog:validate")).toBeVisible();
  await expect(
    page.getByText(/Prices are intentionally omitted/),
  ).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
