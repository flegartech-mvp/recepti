import type {
  PackageUnit,
  RetailerOffer,
  RetailerPreferences,
  RetailerProduct,
} from "./types";

type StandardFamily = "mass" | "volume" | "count";

const conversions: Record<
  PackageUnit,
  { family: StandardFamily; factor: number; standard: PackageUnit }
> = {
  g: { family: "mass", factor: 1, standard: "g" },
  kg: { family: "mass", factor: 1_000, standard: "g" },
  ml: { family: "volume", factor: 1, standard: "ml" },
  cl: { family: "volume", factor: 10, standard: "ml" },
  dl: { family: "volume", factor: 100, standard: "ml" },
  l: { family: "volume", factor: 1_000, standard: "ml" },
  piece: { family: "count", factor: 1, standard: "piece" },
  pack: { family: "count", factor: 1, standard: "pack" },
};

export function convertComparableQuantity(
  quantity: number,
  from: PackageUnit,
  to: PackageUnit,
): number | null {
  const source = conversions[from];
  const target = conversions[to];
  if (source.family !== target.family) return null;
  if (source.family === "count" && source.standard !== target.standard)
    return null;
  return (quantity * source.factor) / target.factor;
}

export function isOfferActive(offer: RetailerOffer, at = new Date()): boolean {
  const timestamp = at.getTime();
  return (
    (!offer.validFrom || new Date(offer.validFrom).getTime() <= timestamp) &&
    (!offer.validUntil || new Date(offer.validUntil).getTime() >= timestamp)
  );
}

export function effectiveOfferPrice(
  offer: RetailerOffer,
  preferences: Pick<
    RetailerPreferences,
    "allowLoyaltyPrices" | "preferPromotions"
  >,
  at = new Date(),
): { price: number; kind: "regular" | "promotion" | "loyalty" } | null {
  if (!isOfferActive(offer, at)) return null;
  const candidates: Array<{
    price: number;
    kind: "regular" | "promotion" | "loyalty";
  }> = [];
  if (offer.regularPrice !== null)
    candidates.push({ price: offer.regularPrice, kind: "regular" });
  if (preferences.preferPromotions && offer.promotionalPrice !== null)
    candidates.push({ price: offer.promotionalPrice, kind: "promotion" });
  if (preferences.allowLoyaltyPrices && offer.loyaltyPrice !== null)
    candidates.push({ price: offer.loyaltyPrice, kind: "loyalty" });
  return candidates.sort((a, b) => a.price - b.price)[0] ?? null;
}

export interface PackageEstimate {
  packages: number;
  totalCost: number;
  excessQuantity: number;
  priceKind: "regular" | "promotion" | "loyalty";
}

export function estimatePackages(
  product: RetailerProduct,
  requiredQuantity: number,
  requiredUnit: PackageUnit,
  preferences: Pick<
    RetailerPreferences,
    "allowLoyaltyPrices" | "preferPromotions"
  >,
  at = new Date(),
): PackageEstimate | null {
  if (!product.packageQuantity || !product.packageUnit || requiredQuantity <= 0)
    return null;
  const convertedRequired = convertComparableQuantity(
    requiredQuantity,
    requiredUnit,
    product.packageUnit,
  );
  if (convertedRequired === null) return null;
  const offer = product.offers
    .map((candidate) => ({
      candidate,
      effective: effectiveOfferPrice(candidate, preferences, at),
    }))
    .filter(
      (
        entry,
      ): entry is {
        candidate: RetailerOffer;
        effective: NonNullable<ReturnType<typeof effectiveOfferPrice>>;
      } => Boolean(entry.effective),
    )
    .sort((a, b) => a.effective.price - b.effective.price)[0];
  if (!offer) return null;
  const packages = Math.ceil(convertedRequired / product.packageQuantity);
  return {
    packages,
    totalCost: Number((packages * offer.effective.price).toFixed(2)),
    excessQuantity: Number(
      (packages * product.packageQuantity - convertedRequired).toFixed(3),
    ),
    priceKind: offer.effective.kind,
  };
}

export interface BasketCandidate {
  itemId: string;
  retailerSlug: RetailerProduct["retailerSlug"];
  productId: string;
  totalCost: number;
}

export function optimizeBasket(
  candidates: BasketCandidate[],
  mode: "single-store" | "split",
): {
  total: number;
  choices: BasketCandidate[];
  retailerSlug: RetailerProduct["retailerSlug"] | null;
} | null {
  const itemIds = [...new Set(candidates.map((candidate) => candidate.itemId))];
  if (itemIds.length === 0) return null;
  if (mode === "split") {
    const choices = itemIds
      .map(
        (itemId) =>
          candidates
            .filter((candidate) => candidate.itemId === itemId)
            .sort((a, b) => a.totalCost - b.totalCost)[0],
      )
      .filter((choice): choice is BasketCandidate => Boolean(choice));
    if (choices.length !== itemIds.length) return null;
    return {
      total: Number(
        choices.reduce((sum, choice) => sum + choice.totalCost, 0).toFixed(2),
      ),
      choices,
      retailerSlug: null,
    };
  }
  const retailers = [
    ...new Set(candidates.map((candidate) => candidate.retailerSlug)),
  ];
  const baskets = retailers
    .map((retailerSlug) => {
      const choices = itemIds
        .map(
          (itemId) =>
            candidates
              .filter(
                (candidate) =>
                  candidate.itemId === itemId &&
                  candidate.retailerSlug === retailerSlug,
              )
              .sort((a, b) => a.totalCost - b.totalCost)[0],
        )
        .filter((choice): choice is BasketCandidate => Boolean(choice));
      return choices.length === itemIds.length
        ? {
            retailerSlug,
            choices,
            total: Number(
              choices
                .reduce((sum, choice) => sum + choice.totalCost, 0)
                .toFixed(2),
            ),
          }
        : null;
    })
    .filter((basket): basket is NonNullable<typeof basket> => Boolean(basket));
  return baskets.sort((a, b) => a.total - b.total)[0] ?? null;
}
