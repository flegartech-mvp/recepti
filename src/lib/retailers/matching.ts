import { findIngredientDefinitionByText } from "@/data/pantry-starters";
import { normalizeIngredientSearch } from "@/lib/domain/ingredient-search";
import type { ShoppingListItem } from "@/types/domain";

import type { RetailerPreferences, RetailerProduct } from "./types";

export function hasRetailerPriceData(
  products: readonly RetailerProduct[],
): boolean {
  return products.some(
    (product) =>
      product.price !== null &&
      Number.isFinite(product.price) &&
      product.price > 0,
  );
}

export function productMatchesShoppingItem(
  product: RetailerProduct,
  item: Pick<ShoppingListItem, "ingredientId" | "ingredientName">,
): boolean {
  if (
    item.ingredientId &&
    product.ingredientIds.some(
      (id) =>
        id.toLocaleLowerCase("en-US") ===
        item.ingredientId?.toLocaleLowerCase("en-US"),
    )
  ) {
    return true;
  }
  const definition = findIngredientDefinitionByText(item.ingredientName);
  if (definition && product.ingredientSlugs.includes(definition.slug))
    return true;
  const name = normalizeIngredientSearch(item.ingredientName);
  return product.ingredientSlugs.some(
    (slug) => normalizeIngredientSearch(slug) === name,
  );
}

export function rankRetailerProducts(
  products: readonly RetailerProduct[],
  preferences: RetailerPreferences,
  item?: Pick<ShoppingListItem, "ingredientId" | "ingredientName">,
): RetailerProduct[] {
  const pricingAvailable = hasRetailerPriceData(products);
  const preferredBrands = new Set(
    preferences.preferredBrands.map(normalizeIngredientSearch),
  );
  const excludedBrands = new Set(
    preferences.excludedBrands.map(normalizeIngredientSearch),
  );
  const score = (product: RetailerProduct) => {
    let value = 0;
    if (product.retailerSlug === preferences.preferredRetailer) value += 100;
    if (
      product.brand &&
      preferredBrands.has(normalizeIngredientSearch(product.brand))
    ) {
      value += 60;
    }
    if (
      pricingAvailable &&
      preferences.preferPromotions &&
      product.isPromotional
    )
      value += 25;
    if (pricingAvailable && !product.isLoyaltyPrice) value += 5;
    return value;
  };

  return products
    .filter(
      (product) =>
        preferences.enabledRetailers.includes(product.retailerSlug) &&
        (!pricingAvailable ||
          preferences.allowLoyaltyPrices ||
          !product.isLoyaltyPrice) &&
        (!product.brand ||
          !excludedBrands.has(normalizeIngredientSearch(product.brand))) &&
        (!item || productMatchesShoppingItem(product, item)),
    )
    .sort(
      (left, right) =>
        score(right) - score(left) ||
        (pricingAvailable
          ? (left.price ?? Number.POSITIVE_INFINITY) -
            (right.price ?? Number.POSITIVE_INFINITY)
          : 0) ||
        left.name.localeCompare(right.name),
    );
}
