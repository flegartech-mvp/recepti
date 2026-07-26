import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test.beforeEach(async ({ context, baseURL }) => {
  await authenticateAs(context, baseURL, "owner");
});

test("presents JSON as a data export rather than a complete backup", async ({
  page,
}) => {
  await page.goto("/settings?tab=data");

  await expect(
    page.getByRole("heading", { name: "Cookbook data export and import" }),
  ).toBeVisible();
  await expect(
    page.getByText(/This is not a complete backup: private image files/),
  ).toBeVisible();
  await expect(
    page.getByText("Backup and restore", { exact: true }),
  ).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JSON export" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^nanas-recipes-export-\d{4}-\d{2}-\d{2}\.json$/u,
  );
});
