import { hoferProducts } from "@/data/retailers/hofer-si";
import { lidlProducts } from "@/data/retailers/lidl-si";
import { sparProducts } from "@/data/retailers/spar-si";
import type { RetailerSlug } from "@/lib/retailers/types";

export const retailerNames: Record<RetailerSlug, string> = {
  "spar-si": "SPAR",
  "hofer-si": "HOFER",
  "lidl-si": "Lidl",
};

/**
 * Curated, source-linked household catalogue. Prices are intentionally absent:
 * retailer offers change faster than a versioned application release.
 */
export const groceryProducts = [
  ...hoferProducts,
  ...lidlProducts,
  ...sparProducts,
];

export const getGroceryProduct = (id: string) =>
  groceryProducts.find((product) => product.id === id) ?? null;
