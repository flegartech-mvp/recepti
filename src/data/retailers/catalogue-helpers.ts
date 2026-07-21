import { getIngredientDefinition } from "@/data/pantry-starters";
import type { RetailerProduct, RetailerSlug } from "@/lib/retailers/types";

export type VerifiedProductRow = readonly [
  ingredientSlug: string,
  name: string,
  brand: string,
  packageLabel: string,
  sourceUrl: string,
];

const SOURCE_CHECKED_AT = "2026-07-20";

function parsePackage(label: string) {
  const normalized = label.trim().toLocaleLowerCase("sl").replace(",", ".");
  const match = normalized.match(
    /^(?:(\d+(?:\.\d+)?)\s*x\s*)?(\d+(?:\.\d+)?)\s*(kg|g|l|ml|kos|kosov|piece|pieces)$/,
  );
  if (!match) throw new Error(`Unsupported package label: ${label}`);

  const multiplier = Number(match[1] ?? 1);
  const quantity = Number(match[2]);
  const unit = match[3];
  if (!Number.isFinite(multiplier) || !Number.isFinite(quantity)) {
    throw new Error(`Invalid package label: ${label}`);
  }

  if (unit === "kg")
    return { quantity: multiplier * quantity * 1000, unit: "g" };
  if (unit === "l")
    return { quantity: multiplier * quantity * 1000, unit: "ml" };
  if (["kos", "kosov", "piece", "pieces"].includes(unit)) {
    return { quantity: multiplier * quantity, unit: "piece" };
  }
  return { quantity: multiplier * quantity, unit };
}

function sourceProductId(sourceUrl: string) {
  const path = new URL(sourceUrl).pathname;
  return (
    path.match(/(?:p|-)(\d{5,})$/)?.[1] ??
    path.split("/").filter(Boolean).at(-1)!
  );
}

export function buildVerifiedProducts(
  retailerSlug: RetailerSlug,
  retailerName: string,
  rows: readonly VerifiedProductRow[],
): RetailerProduct[] {
  return rows.map(([ingredientSlug, name, brand, packageLabel, sourceUrl]) => {
    const ingredient = getIngredientDefinition(ingredientSlug);
    if (!ingredient)
      throw new Error(`Unknown ingredient slug: ${ingredientSlug}`);

    const parsedPackage = parsePackage(packageLabel);
    return {
      id: `${retailerSlug}-${sourceProductId(sourceUrl)}`,
      name,
      brand: brand || undefined,
      category: ingredient.category,
      aliases: [
        ingredient.names.en,
        ingredient.names.sl,
        ...ingredient.aliases,
      ],
      retailerSlug,
      retailerName,
      ingredientSlugs: [ingredientSlug],
      ingredientIds: [],
      price: null,
      currency: "EUR",
      unitLabel: packageLabel,
      packageQuantity: parsedPackage.quantity,
      packageUnit: parsedPackage.unit,
      isPromotional: false,
      isLoyaltyPrice: false,
      sourceUrl,
      sourceCheckedAt: SOURCE_CHECKED_AT,
    };
  });
}
