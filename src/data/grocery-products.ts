import type { RetailerProduct, RetailerSlug } from "@/lib/retailers/types";

/** Household-owned catalogue: edit this file to add products and prices. */
export const retailerNames: Record<RetailerSlug, string> = {
  "spar-si": "SPAR", "hofer-si": "HOFER", "lidl-si": "Lidl",
};

export const groceryProducts: RetailerProduct[] = [
  { id: "spar-pasta", name: "Bronasti linguine", retailerSlug: "spar-si", retailerName: "SPAR", ingredientSlugs: ["pasta"], ingredientIds: [], price: 1.89, currency: "EUR", unitLabel: "500 g", packageQuantity: 500, packageUnit: "g", isPromotional: false, isLoyaltyPrice: false },
  { id: "hofer-pasta", name: "Casa Morando špageti", retailerSlug: "hofer-si", retailerName: "HOFER", ingredientSlugs: ["pasta"], ingredientIds: [], price: 1.29, currency: "EUR", unitLabel: "500 g", packageQuantity: 500, packageUnit: "g", isPromotional: true, isLoyaltyPrice: false },
  { id: "lidl-chicken-breast", name: "Piščančji file, družinsko pakiranje", retailerSlug: "lidl-si", retailerName: "Lidl", ingredientSlugs: ["chicken breast"], ingredientIds: [], price: 5.49, currency: "EUR", unitLabel: "800 g", packageQuantity: 800, packageUnit: "g", isPromotional: false, isLoyaltyPrice: false },
  { id: "spar-milk", name: "Sveže mleko", retailerSlug: "spar-si", retailerName: "SPAR", ingredientSlugs: ["milk"], ingredientIds: [], price: 1.19, currency: "EUR", unitLabel: "1 l", packageQuantity: 1, packageUnit: "l", isPromotional: false, isLoyaltyPrice: false },
  { id: "hofer-eggs", name: "Jajca iz proste reje", retailerSlug: "hofer-si", retailerName: "HOFER", ingredientSlugs: ["egg"], ingredientIds: [], price: 2.49, currency: "EUR", unitLabel: "10 pcs", packageQuantity: 10, packageUnit: "piece", isPromotional: false, isLoyaltyPrice: false },
];

export const getGroceryProduct = (id: string) => groceryProducts.find((product) => product.id === id) ?? null;
