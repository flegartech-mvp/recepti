import { getUserSettings } from "@/lib/data/queries";
import { groceryProducts } from "@/data/grocery-products";
import type { Ingredient } from "@/types/domain";

import {
  defaultRetailerPreferences,
  type RetailerPreferences,
  type RetailerProduct,
} from "./types";

/**
 * Curated products are linked by normalized ingredient identity, never a
 * display name, so a renamed product cannot break recipe matching.
 */
export async function listComparisonProducts(
  ingredients: Pick<Ingredient, "id" | "normalizedName">[],
): Promise<RetailerProduct[]> {
  const idsBySlug = new Map(
    ingredients.map((ingredient) => [ingredient.normalizedName, ingredient.id]),
  );
  return groceryProducts
    .map((product) => ({
      ...product,
      ingredientIds: product.ingredientSlugs
        .map((slug) => idsBySlug.get(slug))
        .filter((id): id is string => Boolean(id)),
    }))
    .filter((product) => product.ingredientIds.length > 0);
}

export async function getRetailerPreferences(): Promise<RetailerPreferences> {
  const settings = await getUserSettings();
  return {
    ...defaultRetailerPreferences,
    enabledRetailers: settings.enabledRetailers,
    preferredRetailer: settings.preferredRetailer,
    allowLoyaltyPrices: settings.allowLoyaltyPrices,
    allowSplitBasket: settings.allowSplitBasket,
    preferPromotions: settings.preferPromotions,
    preferredBrands: settings.preferredBrands,
    excludedBrands: settings.excludedBrands,
  };
}
