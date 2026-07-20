export const RETAILER_SLUGS = ["spar-si", "hofer-si", "lidl-si"] as const;

export type RetailerSlug = (typeof RETAILER_SLUGS)[number];

export interface RetailerPreferences {
  enabledRetailers: RetailerSlug[];
  preferredRetailer: RetailerSlug | null;
  allowLoyaltyPrices: boolean;
  allowSplitBasket: boolean;
  preferPromotions: boolean;
  preferredBrands: string[];
  excludedBrands: string[];
}

export const defaultRetailerPreferences: RetailerPreferences = {
  enabledRetailers: [...RETAILER_SLUGS],
  preferredRetailer: null,
  allowLoyaltyPrices: false,
  allowSplitBasket: true,
  preferPromotions: true,
  preferredBrands: [],
  excludedBrands: [],
};

export interface RetailerProduct {
  id: string;
  name: string;
  retailerSlug: RetailerSlug;
  retailerName: string;
  ingredientIds: string[];
  price: number | null;
  currency: string;
  unitLabel: string | null;
  isPromotional: boolean;
  isLoyaltyPrice: boolean;
}
