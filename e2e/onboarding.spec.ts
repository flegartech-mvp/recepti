import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test("turns a fresh cookbook selection into a guided first match", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticateAs(context, baseURL, "owner");
  await page.goto("/getting-started?fresh=1");

  await expect(
    page.getByRole("heading", {
      name: "Start cooking in a few minutes",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Choose a starter recipe shelf" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Select what you usually keep at home",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Quick tomato spaghetti", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Create starter cookbook" }).click();

  await expect(page).toHaveURL(/\/cook-with-what-i-have\?guided=1$/);
  await expect(
    page.getByText("Your first matches are ready", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ready to cook" }).first(),
  ).toBeVisible();
});

test("keeps first-use setup usable on a narrow phone in dark mode", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    localStorage.setItem("theme", "blue-dark");
  });
  await page.goto("/getting-started?fresh=1");

  await expect(
    page.getByRole("heading", {
      name: "Start cooking in a few minutes",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create starter cookbook" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await expect(page.locator("html")).toHaveClass(/blue-dark/);
});
