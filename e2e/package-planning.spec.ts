import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.beforeEach(async ({ context, baseURL }) => {
  await authenticateAs(context, baseURL, "owner");
});

test("shows generic package guidance without retailer claims", async ({
  page,
}) => {
  await page.goto("/shopping-list");

  await expect(
    page.getByText("Package planning", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Generic package-size guidance is available for 2 items.", {
      exact: true,
    }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Plan package sizes for Parmesan" })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Package plan for Parmesan",
  });
  await expect(dialog).toContainText("1 × 100 g");
  await expect(dialog).toContainText("exact quantity");
  await expect(dialog).toContainText(
    "Generic size combinations for planning only.",
  );
  await expect(dialog).not.toContainText(/SPAR|HOFER|Lidl|price|promotion/i);
});
