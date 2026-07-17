import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import { authenticateAs } from "./support/auth";

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.describe("responsive owner experience", () => {
  test("renders the desktop dashboard without overflow or browser errors", async ({
    context,
    page,
    baseURL,
  }) => {
    const browserErrors = collectBrowserErrors(page);
    await authenticateAs(context, baseURL, "owner");
    await page.setViewportSize({ width: 1440, height: 1000 });

    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", {
        name: /Good (morning|afternoon|evening), Nana\./,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(browserErrors).toEqual([]);
    await page.screenshot({
      path: path.join(process.cwd(), "output/playwright/dashboard-desktop.png"),
      fullPage: true,
    });
  });

  test("renders the dark mobile dashboard with thumb navigation", async ({
    context,
    page,
    baseURL,
  }) => {
    const browserErrors = collectBrowserErrors(page);
    await authenticateAs(context, baseURL, "owner");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });

    await page.goto("/dashboard");

    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(browserErrors).toEqual([]);
    await page.screenshot({
      path: path.join(
        process.cwd(),
        "output/playwright/dashboard-mobile-dark.png",
      ),
      fullPage: true,
    });

    await page.getByRole("button", { name: "Open more navigation" }).click();
    const moreNavigation = page.getByRole("navigation", {
      name: "More navigation",
    });
    await expect(
      moreNavigation.getByRole("link", { name: "Ingredients" }),
    ).toBeVisible();
    await moreNavigation.getByRole("link", { name: "Favorites" }).click();
    await expect(page).toHaveURL(/\/favorites$/);
  });
});
