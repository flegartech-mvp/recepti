import { normalizeSlovenianText } from "./normalization";
import type { RetailerProduct } from "./types";

export interface MatchableIngredient {
  id: string;
  canonicalName: string;
  displayName: string;
  aliases: string[];
  category?: string;
}

export function scoreIngredientMatch(
  product: Pick<RetailerProduct, "name" | "normalizedName" | "category">,
  ingredient: MatchableIngredient,
): number {
  const productName =
    product.normalizedName || normalizeSlovenianText(product.name);
  const candidates = [
    ingredient.canonicalName,
    ingredient.displayName,
    ...ingredient.aliases,
  ]
    .map(normalizeSlovenianText)
    .filter(Boolean);
  if (candidates.some((candidate) => candidate === productName)) return 1;
  if (candidates.some((candidate) => productName.includes(candidate)))
    return 0.86;
  const productTokens = new Set(productName.split(" "));
  const overlap = Math.max(
    ...candidates.map(
      (candidate) =>
        candidate.split(" ").filter((token) => productTokens.has(token))
          .length / Math.max(1, candidate.split(" ").length),
    ),
    0,
  );
  const categoryBonus =
    ingredient.category &&
    product.category &&
    normalizeSlovenianText(ingredient.category) ===
      normalizeSlovenianText(product.category)
      ? 0.08
      : 0;
  return Number(Math.min(0.8, overlap * 0.7 + categoryBonus).toFixed(2));
}

export function applyManualMatchOverride(
  suggested: { ingredientId: string; confidence: number } | null,
  override: {
    ingredientId: string;
    reviewStatus: "approved" | "rejected";
  } | null,
) {
  if (!override) return suggested;
  if (override.reviewStatus === "rejected") return null;
  return {
    ingredientId: override.ingredientId,
    confidence: 1,
    method: "manual" as const,
  };
}
