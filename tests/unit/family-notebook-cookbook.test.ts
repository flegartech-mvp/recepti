import { describe, expect, it } from "vitest";

import {
  familyNotebookCookbook,
  FAMILY_NOTEBOOK_RECIPE_TITLES,
} from "@/data/family-notebook-cookbook";
import { createCookbookImportPreview } from "@/lib/data/cookbook-import";
import { createFamilyNotebookImportPlan } from "@/lib/data/family-notebook-import";
import { DEFAULT_SETTINGS } from "@/lib/data/settings";
import { cookbookExportSchema } from "@/lib/validation";

const EXPECTED_TITLES = [
  "Borovničevi mafini",
  "Kvašeni rogljički z marmelado",
  "Testo za pico",
  "Sirove štručke",
  "Slivova pita",
  "Jabolčna pita",
  "Orehova in makova potica",
  "Limonini razpokančki",
  "Mafini s pomarančo in čokolado",
  "Rahlo pecivo",
  "Višnjevo pecivo",
  "Pijana nevesta",
  "Browniji",
  "Skutne kocke z limono in jagodami",
  "Marry Me Piščanec",
] as const;

describe("reviewed family notebook cookbook", () => {
  it("contains exactly the 15 expected Slovenian recipes once", () => {
    expect(familyNotebookCookbook.recipes).toHaveLength(15);
    expect(FAMILY_NOTEBOOK_RECIPE_TITLES).toEqual(EXPECTED_TITLES);
    expect(new Set(FAMILY_NOTEBOOK_RECIPE_TITLES).size).toBe(15);
  });

  it("is a complete strict published cookbook with valid references", () => {
    expect(() =>
      cookbookExportSchema.parse(familyNotebookCookbook),
    ).not.toThrow();

    const ingredientIds = new Set(
      familyNotebookCookbook.ingredients.map((item) => item.id),
    );
    expect(new Set(ingredientIds).size).toBe(
      familyNotebookCookbook.ingredients.length,
    );

    for (const recipe of familyNotebookCookbook.recipes) {
      expect(recipe.status).toBe("published");
      expect(recipe.sourceName).toBe("Domači zvezek receptov");
      expect(recipe.ingredients.length).toBeGreaterThan(0);
      expect(recipe.steps.length).toBeGreaterThan(0);
      expect(recipe.imagePath).toBeNull();
      expect(recipe.notes).toMatch(/PDF stran \d+\./);
      for (const item of recipe.ingredients) {
        expect(ingredientIds.has(item.ingredientId)).toBe(true);
      }
      for (const item of recipe.steps) {
        expect(item.imagePath).toBeNull();
      }
    }
  });

  it("preserves Slovenian diacritics in titles, ingredients and instructions", () => {
    const serialized = JSON.stringify(familyNotebookCookbook);
    for (const character of ["č", "š", "ž"]) {
      expect(serialized).toContain(character);
    }
    expect(serialized).toContain("izkoščičene");
    expect(serialized).toContain("češ");
  });
});

describe("family notebook idempotent import plan", () => {
  it("imports all titles on the first run", () => {
    const plan = createFamilyNotebookImportPlan([], DEFAULT_SETTINGS);
    expect(plan.preview).toMatchObject({
      totalRecipes: 15,
      importableRecipes: 15,
      skippedRecipes: 0,
      allImported: false,
    });
    expect(plan.payload.recipes).toHaveLength(15);
    expect(plan.payload.pantryItems).toEqual([]);
    expect(plan.payload.shoppingListItems).toEqual([]);
    expect(plan.payload.cookingHistory).toEqual([]);
    expect(plan.payload.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("imports zero and creates no duplicate payload on the second run", () => {
    const plan = createFamilyNotebookImportPlan(
      EXPECTED_TITLES,
      DEFAULT_SETTINGS,
    );
    expect(plan.preview).toMatchObject({
      importableRecipes: 0,
      skippedRecipes: 15,
      allImported: true,
    });
    expect(plan.payload.recipes).toEqual([]);
    expect(plan.payload.ingredients).toEqual([]);
  });

  it("imports only missing titles from a partial cookbook", () => {
    const present = EXPECTED_TITLES.slice(0, 6).map((title, index) =>
      index % 2 === 0 ? `  ${title.toLocaleUpperCase("sl")}  ` : title,
    );
    const plan = createFamilyNotebookImportPlan(present, DEFAULT_SETTINGS);
    expect(plan.preview.importableRecipes).toBe(9);
    expect(plan.preview.skippedRecipes).toBe(6);
    expect(plan.preview.importableRecipeTitles).toEqual(
      EXPECTED_TITLES.slice(6),
    );
    const referencedIds = new Set(
      plan.payload.recipes.flatMap((recipe) =>
        recipe.ingredients.map((item) => item.ingredientId),
      ),
    );
    expect(
      plan.payload.ingredients.every((item) => referencedIds.has(item.id)),
    ).toBe(true);
  });

  it("does not weaken normal backup duplicate protection", () => {
    const preview = createCookbookImportPreview(familyNotebookCookbook, [
      "  borovničevi MAFINI ",
    ]);
    expect(preview.duplicateRecipeTitles).toEqual(["Borovničevi mafini"]);
  });
});
