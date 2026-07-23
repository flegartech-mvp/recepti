import { getUserSettings } from "@/lib/data/queries";
import { groceryProducts } from "@/data/grocery-products";
import { findIngredientDefinition } from "@/data/pantry-starters";
import type { Ingredient } from "@/types/domain";

import {
  defaultRetailerPreferences,
  type RetailerPreferences,
  type RetailerProduct,
} from "./types";
import { hasRetailerPriceData } from "./matching";

/**
 * Curated products are linked by normalized ingredient identity, never a
 * display name, so a renamed product cannot break recipe matching.
 */
export async function listComparisonProducts(
  ingredients: Pick<Ingredient, "id" | "normalizedName">[],
): Promise<RetailerProduct[]> {
  const idsBySlug = new Map<string, string>();
  for (const ingredient of ingredients) {
    const definition = findIngredientDefinition({
      ...ingredient,
      canonicalName: ingredient.normalizedName,
      displayName: ingredient.normalizedName,
      aliases: [],
    });
    idsBySlug.set(definition?.slug ?? ingredient.normalizedName, ingredient.id);
  }
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
  const pricingAvailable = hasRetailerPriceData(groceryProducts);
  return {
    ...defaultRetailerPreferences,
    enabledRetailers: settings.enabledRetailers,
    preferredRetailer: settings.preferredRetailer,
    allowLoyaltyPrices: pricingAvailable && settings.allowLoyaltyPrices,
    allowSplitBasket: pricingAvailable && settings.allowSplitBasket,
    preferPromotions: pricingAvailable && settings.preferPromotions,
    preferredBrands: settings.preferredBrands,
    excludedBrands: settings.excludedBrands,
  };
}
