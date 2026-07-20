import { getUserSettings } from "@/lib/data/queries";

import {
  defaultRetailerPreferences,
  type RetailerPreferences,
  type RetailerProduct,
} from "./types";

/**
 * Retailer catalogue imports are intentionally optional. The rest of the
 * cookbook stays fully usable until an authorized feed has supplied products.
 */
export async function listComparisonProducts(
  ingredientIds: string[],
): Promise<RetailerProduct[]> {
  void ingredientIds;
  return [];
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
