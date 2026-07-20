import { describe, expect, it } from "vitest";

import {
  productMatchesShoppingItem,
  rankRetailerProducts,
} from "@/lib/retailers/matching";
import {
  defaultRetailerPreferences,
  type RetailerProduct,
} from "@/lib/retailers/types";

function product(
  id: string,
  overrides: Partial<RetailerProduct> = {},
): RetailerProduct {
  return {
    id,
    name: id,
    retailerSlug: "spar-si",
    retailerName: "SPAR",
    ingredientIds: [],
    ingredientSlugs: ["chicken-breast"],
    price: null,
    currency: "EUR",
    unitLabel: "500 g",
    packageQuantity: 500,
    packageUnit: "g",
    isPromotional: false,
    isLoyaltyPrice: false,
    ...overrides,
  };
}

describe("retailer product matching", () => {
  it("matches a shopping item through canonical identity or a database ID", () => {
    const candidate = product("chicken", {
      ingredientIds: ["ingredient-1"],
    });
    expect(
      productMatchesShoppingItem(candidate, {
        ingredientId: null,
        ingredientName: "Piščančje prsi",
      }),
    ).toBe(true);
    expect(
      productMatchesShoppingItem(candidate, {
        ingredientId: "INGREDIENT-1",
        ingredientName: "Unrelated display name",
      }),
    ).toBe(true);
  });

  it("filters disabled retailers, excluded brands, and disallowed loyalty prices", () => {
    const ranked = rankRetailerProducts(
      [
        product("allowed"),
        product("disabled", { retailerSlug: "hofer-si" }),
        product("excluded", { brand: "Blocked brand" }),
        product("loyalty", { isLoyaltyPrice: true }),
      ],
      {
        ...defaultRetailerPreferences,
        enabledRetailers: ["spar-si"],
        excludedBrands: ["blocked BRAND"],
      },
    );
    expect(ranked.map((item) => item.id)).toEqual(["allowed"]);
  });

  it("ranks the preferred retailer, then preferred brands and promotions", () => {
    const ranked = rankRetailerProducts(
      [
        product("promotion", { isPromotional: true }),
        product("brand", { brand: "Favourite" }),
        product("retailer", { retailerSlug: "lidl-si" }),
      ],
      {
        ...defaultRetailerPreferences,
        preferredRetailer: "lidl-si",
        preferredBrands: ["favourite"],
      },
    );
    expect(ranked.map((item) => item.id)).toEqual([
      "retailer",
      "brand",
      "promotion",
    ]);
  });

  it("returns only products for the requested shopping ingredient", () => {
    const ranked = rankRetailerProducts(
      [product("chicken"), product("milk", { ingredientSlugs: ["milk"] })],
      defaultRetailerPreferences,
      { ingredientId: null, ingredientName: "Chicken breast" },
    );
    expect(ranked.map((item) => item.id)).toEqual(["chicken"]);
  });
});
