import { describe, expect, it } from "vitest";

import {
  ingredientDefinitionToIngredient,
  pantryStarters,
  withStarterIngredients,
} from "@/data/pantry-starters";
import {
  normalizeIngredientSearch,
  searchIngredients,
} from "@/lib/domain/ingredient-search";
import type { RetailerProduct } from "@/lib/retailers/types";

describe("shared ingredient search", () => {
  const catalog = pantryStarters.map(ingredientDefinitionToIngredient);

  it("normalizes case, punctuation, and Slovenian accents", () => {
    expect(normalizeIngredientSearch("  ČRNI  poper! ")).toBe("crni poper");
  });

  it("matches localized names and aliases without full typing", () => {
    expect(
      searchIngredients(catalog, "ces", { locale: "sl" })[0]?.displayName,
    ).toBe("Česen");
    expect(
      searchIngredients(catalog, "garlic cl", { locale: "en" })[0]
        ?.canonicalName,
    ).toBe("Garlic");
  });

  it("ranks exact and prefix matches ahead of fuzzy matches", () => {
    const results = searchIngredients(catalog, "rice", { locale: "en" });
    expect(results[0]?.displayName).toBe("Rice");
    expect(
      results.some((result) => result.displayName === "Basmati rice"),
    ).toBe(true);
  });

  it("deduplicates a database ingredient represented by a starter identity", () => {
    const egg = ingredientDefinitionToIngredient(
      pantryStarters.find((definition) => definition.slug === "eggs")!,
    );
    const merged = withStarterIngredients([
      {
        ...egg,
        id: "00000000-0000-4000-8000-000000000001",
        canonicalName: "Egg",
        displayName: "Egg",
        normalizedName: "egg",
      },
    ]);
    expect(
      searchIngredients(merged, "egg").filter(
        (result) => result.ingredientSlug === "eggs",
      ),
    ).toHaveLength(1);
  });

  it("finds an ingredient through an associated retailer product", () => {
    const product: RetailerProduct = {
      id: "verified-example",
      name: "MILFINA Slovensko čajno maslo",
      brand: "MILFINA",
      retailerSlug: "hofer-si",
      retailerName: "HOFER",
      ingredientIds: [],
      ingredientSlugs: ["butter"],
      price: null,
      currency: "EUR",
      unitLabel: "250 g",
      packageQuantity: 250,
      packageUnit: "g",
      isPromotional: false,
      isLoyaltyPrice: false,
    };
    expect(
      searchIngredients(catalog, "milfina", { products: [product] })[0]
        ?.ingredientSlug,
    ).toBe("butter");
  });

  it("returns no canonical match for a genuinely custom ingredient", () => {
    expect(searchIngredients(catalog, "purple dragonfruit relish")).toEqual([]);
  });
});
