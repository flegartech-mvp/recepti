import { describe, expect, it } from "vitest";

import { normalizeLocale } from "@/lib/i18n/config";
import {
  formatDate,
  formatList,
  formatNumber,
  plural,
  translate,
} from "@/lib/i18n/translate";
import { ingredientSchema, createRecipeSchema } from "@/lib/validation";

describe("English and Slovenian localization", () => {
  it("detects Slovenian browser locales and otherwise falls back to English", () => {
    expect(normalizeLocale("sl-SI")).toBe("sl");
    expect(normalizeLocale("sl")).toBe("sl");
    expect(normalizeLocale("de-DE")).toBe("en");
    expect(normalizeLocale(undefined)).toBe("en");
  });

  it("falls back safely to English when a Slovenian translation is missing", () => {
    expect(translate("sl", "A future untranslated message")).toBe(
      "A future untranslated message",
    );
  });

  it("localizes the shared ingredient autocomplete controls", () => {
    expect(translate("sl", "Ingredient suggestions")).toBe("Predlogi sestavin");
    expect(translate("sl", "Add custom ingredient")).toBe(
      "Dodaj sestavino po meri",
    );
    expect(translate("sl", "Catalogue options")).toBe("Možnosti v katalogih");
    expect(translate("sl", "Compare {name}", { name: "Mleko" })).toBe(
      "Primerjaj Mleko",
    );
  });

  it("formats Slovenian numbers, dates, lists, and four plural forms", () => {
    expect(formatNumber("sl", 12345.5)).toMatch(/12\.345,5/);
    expect(formatDate("sl", "2026-07-16")).toMatch(/16\. jul\. 2026/iu);
    expect(formatList("sl", ["česen", "špinača", "žafran"])).toContain(" in ");
    expect(
      [1, 2, 3, 5].map((count) =>
        plural("sl", count, {
          one: "{count} serving",
          two: "{count} servings-two",
          few: "{count} servings-few",
          other: "{count} servings",
        }),
      ),
    ).toEqual(["1 porcija", "2 porciji", "3 porcije", "5 porcij"]);
  });

  it("preserves Slovenian diacritics through validation and JSON round trips", () => {
    const ingredient = ingredientSchema.parse({
      canonicalName: "Česen",
      displayName: "Česen in žafran",
      category: "produce",
      defaultUnit: "ščepec",
      aliases: ["česenček"],
      isStaple: false,
      notes: "Svež, dišeč in še topel.",
    });
    const recipe = createRecipeSchema.parse({
      title: "Žličniki s česnom in špinačo",
      description: "Domač recept babice Špele.",
      category: "dinner",
      cuisine: "Slovenska",
      difficulty: "easy",
      prepMinutes: 10,
      cookMinutes: 20,
      restMinutes: 0,
      servings: 2,
      dietaryTags: [],
      customTags: ["družinsko"],
      sourceName: null,
      sourceUrl: null,
      notes: "Postrezi še vroče.",
      status: "published",
      isFavorite: true,
      imagePath: null,
      ingredients: [
        {
          canonicalName: ingredient.canonicalName,
          displayName: ingredient.displayName,
          quantity: 1,
          unit: ingredient.defaultUnit,
          preparationNote: "drobno sesekljan",
          isOptional: false,
          isGarnish: false,
          sectionName: null,
          sortOrder: 0,
        },
      ],
      steps: [
        {
          instruction: "Česen nežno popraži, nato dodaj špinačo.",
          timerMinutes: 5,
          sortOrder: 0,
        },
      ],
    });

    expect(JSON.parse(JSON.stringify(recipe))).toEqual(recipe);
    expect(recipe.title).toBe("Žličniki s česnom in špinačo");
  });
});
