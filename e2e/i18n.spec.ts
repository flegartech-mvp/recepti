import { expect, test } from "@playwright/test";

import { authenticateAs } from "./support/auth";

test("switches immediately and persists Slovenian without a reload", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticateAs(context, baseURL, "signed-out");
  await page.goto("/");

  await page
    .getByRole("button", { name: "Switch language to Slovenian" })
    .click();

  await expect(page.locator("html")).toHaveAttribute("lang", "sl");
  await expect(
    page.getByRole("heading", {
      name: "Zasebna kuharica enega gospodinjstva, prikazana v javnem predogledu.",
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("nanas-recipes:locale")),
    )
    .toBe("sl");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "sl");
  await expect(
    page.getByRole("button", { name: "Preklopi jezik na angleščino" }),
  ).toBeVisible();
});

test("detects Slovenian on a first visit", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, locale: "sl-SI" });
  const page = await context.newPage();
  await page.goto("/");

  await expect(page.locator("html")).toHaveAttribute("lang", "sl");
  await expect(
    page.getByRole("heading", {
      name: "Zasebna kuharica enega gospodinjstva, prikazana v javnem predogledu.",
    }),
  ).toBeVisible();
  await context.close();
});

test("keeps Slovenian usable in both themes at narrow mobile widths", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Switch language to Slovenian" })
    .click();

  await expect(page.getByText("Kaj lahko skuham danes?")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  await page.getByRole("button", { name: "Preklopi na temni način" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("link", { name: "Recepti", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Knjižnica receptov" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test("preserves user-entered diacritics across language changes and draft reloads", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/recipes/new");
  await page
    .getByRole("button", { name: "Switch language to Slovenian" })
    .click();

  const title = "Žličniki s česnom in špinačo";
  const instruction = "Česen nežno popraži, nato dodaj špinačo in žafran.";
  await page.getByLabel("Naslov recepta").fill(title);
  await page.getByLabel("Ime sestavine").fill("Česen");
  await page.getByLabel("Besedilo v receptu").fill("Svež česen");
  await page.getByLabel("Količina").fill("1");
  await page.getByLabel("Enota").fill("ščepec");
  await page.getByLabel("Navodilo").fill(instruction);
  await page.waitForTimeout(400);

  await page
    .getByRole("button", { name: "Preklopi jezik na angleščino" })
    .click();
  await expect(page.getByLabel("Recipe title")).toHaveValue(title);
  await expect(page.getByLabel("Instruction")).toHaveValue(instruction);

  const restored = await context.newPage();
  await restored.goto("/recipes/new");
  await expect(restored.getByLabel("Recipe title")).toHaveValue(title);
  await expect(restored.getByLabel("Instruction")).toHaveValue(instruction);

  await restored.goto("/recipes");
  await restored
    .getByPlaceholder("Search title, ingredient, tag, or cuisine")
    .fill("česen žafran");
  await expect(restored).toHaveURL(/q=%C4%8Desen(?:\+|%20)%C5%BEafran/);
  await restored.reload();
  await expect(
    restored.getByPlaceholder("Search title, ingredient, tag, or cuisine"),
  ).toHaveValue("česen žafran");
});

test("renders every main owner page in Slovenian without horizontal overflow", async ({
  context,
  page,
  baseURL,
}) => {
  await authenticateAs(context, baseURL, "owner");
  await page.setViewportSize({ width: 430, height: 932 });
  await page.goto("/dashboard");
  await page
    .getByRole("button", { name: "Switch language to Slovenian" })
    .click();

  const routes = [
    ["/dashboard", "Kaj lahko skuham danes?", "heading"],
    ["/recipes", "Knjižnica receptov", "heading"],
    ["/recipes/new", "Dodaj recept", "heading"],
    ["/favorites", "Priljubljeni recepti", "heading"],
    ["/pantry", "Shramba in hladilnik", "heading"],
    ["/shopping-list", "Nakupovalni seznam", "heading"],
    ["/cook-with-what-i-have", "Kaj lahko skuham?", "heading"],
    ["/ingredients", "Katalog sestavin", "heading"],
    ["/products", "Katalog izdelkov", "heading"],
    ["/settings", "Nastavitve", "heading"],
    ["/settings/catalog", "Upravljanje kataloga", "heading"],
    ["/products/lidl-si-11008519", "Mozzarella XXL", "heading"],
    ["/recipes/r-pasta", "Creamy mushroom pasta", "heading"],
    ["/recipes/r-pasta/cook", "Način kuhanja", "text"],
  ] as const;

  for (const [route, visibleText, role] of routes) {
    await page.goto(route);
    await expect(page.locator("html")).toHaveAttribute("lang", "sl");
    const localizedSurface =
      role === "heading"
        ? page.getByRole("heading", { name: visibleText, exact: true })
        : page.getByText(visibleText, { exact: true });
    await expect(localizedSurface).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }

  await page.goto("/shopping-list");
  await expect(
    page.getByText("Možnosti v katalogih", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("100 g Parmezan", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Poišči možnosti v katalogih za Piščančje prsi",
      exact: true,
    }),
  ).toBeVisible();
});
