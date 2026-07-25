import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test("owner can preview the reviewed family notebook bundle", async ({
  page,
  context,
  baseURL,
}) => {
  await authenticateAs(context, baseURL, "owner");
  await page.goto("/settings");

  await page.getByRole("tab", { name: "Data" }).click();
  await page
    .getByRole("button", { name: "Preview 15 family notebook recipes" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Family notebook import preview" }),
  ).toBeVisible();
  await expect(page.getByText("15 missing, 0 already present")).toBeVisible();
  await expect(page.getByText("Borovničevi mafini")).toBeVisible();
  await expect(page.getByText("Marry Me Piščanec")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Import missing family notebook recipes",
    }),
  ).toBeEnabled();
});
