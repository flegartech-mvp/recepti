import {
  devices,
  expect,
  test,
  type Locator,
  type Page,
} from "@playwright/test";

import { authenticateAs } from "./support/auth";

const mobileViewports = [
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
] as const;

const coreRoutes = [
  "/dashboard",
  "/recipes",
  "/favorites",
  "/pantry",
  "/cook-with-what-i-have",
  "/shopping-list",
  "/ingredients",
  "/products",
  "/settings",
  "/settings/catalog",
  "/recipes/r-pasta",
] as const;

test.use({ ...devices["Pixel 5"] });
test.setTimeout(90_000);

function collectBrowserErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const documentWidth = Math.max(
            document.documentElement.scrollWidth,
            document.body?.scrollWidth ?? 0,
          );
          return documentWidth - document.documentElement.clientWidth;
        }),
      { message: `${label} should not scroll horizontally`, timeout: 5_000 },
    )
    .toBeLessThanOrEqual(1);
}

async function expectWithinViewport(
  locator: Locator,
  page: Page,
  label: string,
) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  await locator.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box, `${label} should have a layout box`).not.toBeNull();
  expect(viewport, "the page should have an explicit viewport").not.toBeNull();
  if (!box || !viewport) return;

  expect(
    box.x,
    `${label} should not leave the left edge`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    box.y,
    `${label} should not leave the top edge`,
  ).toBeGreaterThanOrEqual(-1);
  expect(
    box.x + box.width,
    `${label} should not leave the right edge`,
  ).toBeLessThanOrEqual(viewport.width + 1);
  expect(
    box.y + box.height,
    `${label} should not leave the bottom edge`,
  ).toBeLessThanOrEqual(viewport.height + 1);
}

async function expectTouchTarget(locator: Locator, label: string) {
  await expect(locator, `${label} should be visible`).toBeVisible();
  const box = await locator.boundingBox();

  expect(box, `${label} should have a layout box`).not.toBeNull();
  if (!box) return;

  expect(
    box.width,
    `${label} should be at least 44px wide`,
  ).toBeGreaterThanOrEqual(43.5);
  expect(
    box.height,
    `${label} should be at least 44px tall`,
  ).toBeGreaterThanOrEqual(43.5);
}

async function expectComfortableTextInput(locator: Locator, label: string) {
  await expectTouchTarget(locator, label);
  const fontSize = await locator.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).fontSize),
  );
  expect(
    fontSize,
    `${label} should use at least 16px text to avoid mobile zoom`,
  ).toBeGreaterThanOrEqual(16);
}

async function expectMobileNavigationClearance(page: Page) {
  const navigation = page.getByRole("navigation", {
    name: "Mobile navigation",
  });
  const main = page.locator("#main-content");
  const navigationBox = await navigation.boundingBox();
  const bottomPadding = await main.evaluate((element) =>
    Number.parseFloat(window.getComputedStyle(element).paddingBottom),
  );

  expect(
    navigationBox,
    "mobile navigation should have a layout box",
  ).not.toBeNull();
  if (!navigationBox) return;

  expect(
    bottomPadding,
    "main content padding should clear the fixed mobile navigation",
  ).toBeGreaterThanOrEqual(navigationBox.height - 1);
  await expectWithinViewport(navigation, page, "mobile navigation");
}

test("keeps the app shell mobile-native from 320px through tablet layouts", async ({
  context,
  page,
  baseURL,
}) => {
  const browserErrors = collectBrowserErrors(page);
  await authenticateAs(context, baseURL, "owner");
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });

  for (const viewport of mobileViewports) {
    await page.setViewportSize(viewport);
    await page.goto("/dashboard");

    await expect(
      page.getByRole("heading", {
        name: /Good (morning|afternoon|evening), cook\./,
      }),
    ).toBeVisible({ timeout: 15_000 });
    await expectNoHorizontalOverflow(page, `dashboard at ${viewport.width}px`);

    const themeToggle = page.getByRole("button", {
      name: /Switch to (dark|light) mode/,
    });
    await expectWithinViewport(
      themeToggle,
      page,
      `theme toggle at ${viewport.width}px`,
    );

    if (viewport.width < 1024) {
      const mobileNavigation = page.getByRole("navigation", {
        name: "Mobile navigation",
      });
      await expect(mobileNavigation).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Main navigation" }),
      ).toBeHidden();
      await expectTouchTarget(
        page.getByRole("button", { name: "Open more navigation" }),
        `more navigation button at ${viewport.width}px`,
      );
      await expectTouchTarget(
        themeToggle,
        `theme toggle at ${viewport.width}px`,
      );
      for (const link of await mobileNavigation.getByRole("link").all()) {
        await expectTouchTarget(
          link,
          `${(await link.textContent())?.trim() || "mobile navigation link"} at ${viewport.width}px`,
        );
      }
      await expectMobileNavigationClearance(page);
    } else {
      await expect(
        page.getByRole("navigation", { name: "Mobile navigation" }),
      ).toBeHidden();
      const mainNavigation = page.getByRole("navigation", {
        name: "Main navigation",
      });
      await expect(mainNavigation).toBeVisible();
      await expectTouchTarget(
        mainNavigation.getByRole("link", { name: "Home" }),
        "desktop navigation Home link at 1024px",
      );
    }
  }

  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );
  const inputMode = await page.evaluate(() => ({
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    touchPoints: navigator.maxTouchPoints,
  }));
  expect(inputMode.coarsePointer).toBe(true);
  expect(inputMode.touchPoints).toBeGreaterThan(0);
  expect(browserErrors).toEqual([]);
});

test("keeps every primary owner route usable at 320px", async ({
  context,
  page,
  baseURL,
}) => {
  const browserErrors = collectBrowserErrors(page);
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const route of coreRoutes) {
    await page.goto(route);
    await expect(page.locator("#main-content h1").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("navigation", { name: "Mobile navigation" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page, route);

    const visibleTextFieldSizes = await page
      .locator(
        'input:not([type]), input[type="text"], input[type="search"], input[type="number"], input[type="date"], input[type="email"], input[type="url"], input[type="tel"], textarea',
      )
      .evaluateAll((elements) =>
        elements.flatMap((element) => {
          const style = window.getComputedStyle(element);
          const box = element.getBoundingClientRect();
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            box.width === 0 ||
            box.height === 0
          ) {
            return [];
          }
          return [Number.parseFloat(style.fontSize)];
        }),
      );
    for (const fontSize of visibleTextFieldSizes) {
      expect(
        fontSize,
        `${route} text fields should use at least 16px text`,
      ).toBeGreaterThanOrEqual(16);
    }
  }

  expect(browserErrors).toEqual([]);
});

test("fits recipe search, filters, selects, and view controls on a phone", async ({
  context,
  page,
  baseURL,
}) => {
  const browserErrors = collectBrowserErrors(page);
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recipes", { waitUntil: "networkidle" });

  const search = page.getByLabel("Search recipes");
  await expectComfortableTextInput(search, "recipe search");
  await search.fill("mushroom");
  await expect(page).toHaveURL(/q=mushroom/, { timeout: 10_000 });

  const filtersButton = page.getByRole("button", { name: "Filters (1)" });
  await expectTouchTarget(filtersButton, "recipe filters button");
  await filtersButton.click();

  const sheet = page.getByRole("dialog", { name: "Filter recipes" });
  await expectWithinViewport(sheet, page, "recipe filters sheet");
  const cuisine = sheet.getByLabel("Cuisine");
  await expectTouchTarget(cuisine, "cuisine select");
  await cuisine.click();
  const italian = page.getByRole("option", { name: "Italian-inspired" });
  await expectTouchTarget(italian, "Italian-inspired option");
  await italian.click();

  await expect(page).toHaveURL(/cuisine=Italian-inspired/);
  await sheet.getByRole("button", { name: "Close" }).click();
  await expect(sheet).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Creamy mushroom pasta" }),
  ).toBeVisible();

  const listView = page.getByRole("button", { name: "List view" });
  await expectTouchTarget(listView, "list view button");
  await listView.click();
  await expect(page).toHaveURL(/view=list/);
  await expectNoHorizontalOverflow(page, "filtered recipe list");
  expect(browserErrors).toEqual([]);
});

test("keeps pantry dialogs and fast grocery entry keyboard-friendly at 320px", async ({
  context,
  page,
  baseURL,
}) => {
  const browserErrors = collectBrowserErrors(page);
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/pantry?add=1", { waitUntil: "networkidle" });

  const addDialog = page.getByRole("dialog", { name: "Add pantry item" });
  await expectWithinViewport(addDialog, page, "add pantry item dialog");
  const ingredientName = addDialog.getByLabel("Ingredient name");
  const quantity = addDialog.getByLabel("Quantity");
  const unit = addDialog.getByLabel("Unit");
  await expectComfortableTextInput(ingredientName, "pantry ingredient name");
  await expectComfortableTextInput(quantity, "pantry quantity");
  await expectComfortableTextInput(unit, "pantry unit");
  await expect(quantity).toHaveAttribute("inputmode", "decimal");

  await ingredientName.fill(
    "Extra-long heirloom tomato from the neighborhood market",
  );
  await quantity.fill("2.5");
  await unit.fill("kg");
  const saveItem = addDialog.getByRole("button", { name: "Save item" });
  await expectTouchTarget(saveItem, "save pantry item button");
  await saveItem.click();
  await expect(
    page.getByText("Pantry item saved", { exact: true }),
  ).toBeVisible();
  await expect(addDialog).toBeHidden();

  const fastEntry = page.getByRole("button", { name: "Fast entry" });
  await expectTouchTarget(fastEntry, "fast entry button");
  await fastEntry.click();
  const fastSheet = page.getByRole("dialog", { name: "Fast grocery entry" });
  await expectWithinViewport(fastSheet, page, "fast grocery entry sheet");

  const fastName = fastSheet.getByLabel("Fast ingredient 1");
  const fastQuantity = fastSheet.getByLabel("Quantity 1");
  const fastUnit = fastSheet.getByLabel("Unit 1");
  await expectComfortableTextInput(fastName, "fast ingredient name");
  await expectComfortableTextInput(fastQuantity, "fast ingredient quantity");
  await expectComfortableTextInput(fastUnit, "fast ingredient unit");
  await expect(fastQuantity).toHaveAttribute("inputmode", "decimal");

  const nameBox = await fastName.boundingBox();
  const quantityBox = await fastQuantity.boundingBox();
  expect(nameBox).not.toBeNull();
  expect(quantityBox).not.toBeNull();
  if (nameBox && quantityBox) {
    expect(
      nameBox.y + nameBox.height,
      "the ingredient name should have its own row at 320px",
    ).toBeLessThanOrEqual(quantityBox.y + 1);
  }

  await fastName.fill(
    "An intentionally long mobile grocery ingredient description",
  );
  await fastQuantity.fill("1.25");
  await fastUnit.fill("bunch");
  const saveGroceries = fastSheet.getByRole("button", {
    name: "Save groceries",
  });
  await expectTouchTarget(saveGroceries, "save groceries button");
  await saveGroceries.click();
  await expect(page.getByText(/pantry items? saved$/)).toBeVisible();
  await expect(fastSheet).toBeHidden();
  await expectNoHorizontalOverflow(page, "pantry after mobile entry");
  expect(browserErrors).toEqual([]);
});

test("keeps long editor content and sticky save actions above mobile navigation", async ({
  context,
  page,
  baseURL,
}) => {
  const browserErrors = collectBrowserErrors(page);
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recipes/new", { waitUntil: "networkidle" });

  const title = page.getByLabel("Recipe title");
  await expectComfortableTextInput(title, "recipe title");
  await title.fill(
    "A very long family recipe title with extraordinarily descriptive wording",
  );
  await page
    .getByLabel("Ingredient name")
    .fill("Very-long-no-break-mobile-ingredient-name-that-must-not-overflow");
  await page
    .getByLabel("Instruction")
    .fill(
      "Fold everything together gently and keep stirring until the sauce is glossy and evenly distributed.",
    );

  const saveRecipe = page.getByRole("button", { name: "Save recipe" });
  const saveDraft = page.getByRole("button", { name: "Save draft" });
  const saveAndContinue = page.getByRole("button", {
    name: "Save and continue",
  });
  await saveRecipe.scrollIntoViewIfNeeded();
  const actionBar = saveRecipe.locator("xpath=..");
  await expectWithinViewport(actionBar, page, "recipe editor save actions");
  await expectTouchTarget(saveDraft, "save draft button");
  await expectTouchTarget(saveAndContinue, "save and continue button");
  await expectTouchTarget(saveRecipe, "save recipe button");

  const actionBox = await actionBar.boundingBox();
  const navigationBox = await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .boundingBox();
  expect(actionBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  if (actionBox && navigationBox) {
    expect(
      actionBox.y + actionBox.height,
      "sticky editor actions should not be covered by mobile navigation",
    ).toBeLessThanOrEqual(navigationBox.y + 1);
  }

  await expectNoHorizontalOverflow(page, "recipe editor with long content");
  expect(browserErrors).toEqual([]);
});

test("supports touch cooking controls, timers, and ingredient preparation", async ({
  context,
  page,
  baseURL,
}) => {
  const browserErrors = collectBrowserErrors(page);
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/recipes/r-pasta/cook", { waitUntil: "networkidle" });

  const stepControls = page.getByRole("navigation", {
    name: "Cooking step controls",
  });
  await expectWithinViewport(stepControls, page, "cooking step controls");
  await expectTouchTarget(
    stepControls.getByRole("button", { name: "Back" }),
    "cooking Back button",
  );
  const next = stepControls.getByRole("button", { name: "Next" });
  await expectTouchTarget(next, "cooking Next button");

  const timer = page.getByRole("timer").first();
  const start = page
    .getByRole("button", { name: "Start", exact: true })
    .first();
  await expectTouchTarget(start, "start timer button");
  await start.click();
  await expect(timer).toHaveAttribute("aria-label", /Running/);
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }).first(),
  ).toBeVisible();
  const reset = page
    .getByRole("button", { name: /Reset step 1 timer/i })
    .first();
  await expectTouchTarget(reset, "reset timer button");
  await reset.click();
  await expect(
    page.getByRole("button", { name: "Start", exact: true }).first(),
  ).toBeVisible();

  const ingredient = page
    .getByRole("checkbox", { name: /Mark .* as prepared/ })
    .first();
  const ingredientRow = ingredient.locator("xpath=ancestor::label");
  await expectTouchTarget(ingredientRow, "ingredient preparation row");
  await ingredient.check();
  await expect(
    page.getByText("1 of 5 prepared", { exact: true }),
  ).toBeVisible();

  const showAllSteps = page.getByRole("button", { name: "Show", exact: true });
  await expectTouchTarget(showAllSteps, "show all steps button");
  await showAllSteps.click();
  await expect(page.locator("#full-instruction-list")).toBeVisible();

  await next.click();
  await expect(page.getByText("Step 2 of 3", { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page, "cooking mode");
  expect(browserErrors).toEqual([]);
});

test("keeps mobile authentication and the persistent theme control accessible", async ({
  context,
  page,
  baseURL,
}) => {
  const browserErrors = collectBrowserErrors(page);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await authenticateAs(context, baseURL, "signed-out");
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: "A cookbook that knows what's at home.",
    }),
  ).toBeVisible();
  const themeToggle = page.getByRole("button", {
    name: "Switch to dark mode",
  });
  await expectTouchTarget(themeToggle, "logged-out theme toggle");
  await expectWithinViewport(themeToggle, page, "logged-out theme toggle");
  await themeToggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "logged-out landing page");

  await authenticateAs(context, baseURL, "denied");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/private$/);
  await expect(
    page.getByRole("heading", { name: "This cookbook is private" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Switch to light mode" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page, "private access page");
  expect(browserErrors).toEqual([]);
});
