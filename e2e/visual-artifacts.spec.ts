import path from "node:path";

import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

const captures = [
  {
    name: "desktop-light",
    theme: "light",
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: "desktop-dark",
    theme: "dark",
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: "phone-light",
    theme: "light",
    viewport: { width: 390, height: 844 },
  },
  {
    name: "phone-dark",
    theme: "dark",
    viewport: { width: 390, height: 844 },
  },
] as const;

test("captures the nonna dashboard in both themes and viewports", async ({
  browser,
  baseURL,
}) => {
  for (const capture of captures) {
    const context = await browser.newContext({
      colorScheme: capture.theme,
      reducedMotion: "reduce",
      viewport: capture.viewport,
    });
    await authenticateAs(context, baseURL, "owner");
    await context.addInitScript((theme) => {
      window.localStorage.setItem("theme", theme);
    }, capture.theme);
    const page = await context.newPage();
    const browserErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    page.on("pageerror", (error) => browserErrors.push(error.message));

    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", {
        name: /Good (morning|afternoon|evening), cook\./,
      }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveClass(new RegExp(capture.theme));
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(browserErrors).toEqual([]);

    const devToolsButton = page.getByRole("button", {
      name: "Open Next.js Dev Tools",
    });
    if (await devToolsButton.isVisible()) {
      await devToolsButton.evaluate((element) => {
        (element as HTMLElement).style.display = "none";
      });
    }

    await page.screenshot({
      path: path.join(
        process.cwd(),
        `output/playwright/nonna-dashboard-${capture.name}.png`,
      ),
      fullPage: true,
    });
    await context.close();
  }
});
