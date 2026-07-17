import { describe, expect, it } from "vitest";

import { demoRetailerProducts } from "@/lib/retailers/fixtures";
import {
  convertComparableQuantity,
  effectiveOfferPrice,
  estimatePackages,
  optimizeBasket,
} from "@/lib/retailers/pricing";
import { defaultRetailerPreferences } from "@/lib/retailers/types";

describe("retailer pricing", () => {
  it("selects promotions and excludes loyalty prices by default", () => {
    const offer = demoRetailerProducts.find(
      (product) => product.id === "spar-butter",
    )!.offers[0];
    expect(effectiveOfferPrice(offer, defaultRetailerPreferences)?.kind).toBe(
      "regular",
    );
    expect(
      effectiveOfferPrice(offer, {
        ...defaultRetailerPreferences,
        allowLoyaltyPrices: true,
      })?.kind,
    ).toBe("loyalty");
  });

  it("ignores expired promotions", () => {
    const offer = {
      ...demoRetailerProducts[0].offers[0],
      validUntil: "2020-01-01T00:00:00.000Z",
    };
    expect(effectiveOfferPrice(offer, defaultRetailerPreferences)).toBeNull();
  });

  it("calculates packages, cost, and excess quantity", () => {
    const chicken = demoRetailerProducts.find(
      (product) => product.id === "hofer-chicken",
    )!;
    expect(
      estimatePackages(chicken, 1.2, "kg", defaultRetailerPreferences),
    ).toMatchObject({ packages: 2, totalCost: 11.78, excessQuantity: 0 });
  });

  it("refuses incompatible culinary conversions", () => {
    expect(convertComparableQuantity(1, "l", "kg")).toBeNull();
    expect(convertComparableQuantity(2, "piece", "pack")).toBeNull();
  });

  it("optimizes split and single-store baskets", () => {
    const candidates = [
      {
        itemId: "milk",
        retailerSlug: "spar-si" as const,
        productId: "a",
        totalCost: 2,
      },
      {
        itemId: "bread",
        retailerSlug: "spar-si" as const,
        productId: "b",
        totalCost: 3,
      },
      {
        itemId: "milk",
        retailerSlug: "hofer-si" as const,
        productId: "c",
        totalCost: 1,
      },
      {
        itemId: "bread",
        retailerSlug: "hofer-si" as const,
        productId: "d",
        totalCost: 4,
      },
    ];
    expect(optimizeBasket(candidates, "single-store")?.total).toBe(5);
    expect(optimizeBasket(candidates, "split")?.total).toBe(4);
  });
});
