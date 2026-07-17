"use client";

import { ShoppingBasket, Store } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizePackageUnit } from "@/lib/retailers/normalization";
import {
  estimatePackages,
  optimizeBasket,
  type BasketCandidate,
} from "@/lib/retailers/pricing";
import type {
  RetailerPreferences,
  RetailerProduct,
} from "@/lib/retailers/types";
import type { ShoppingListItem } from "@/types/domain";

export function BasketSummary({
  items,
  products,
  preferences,
}: {
  items: ShoppingListItem[];
  products: RetailerProduct[];
  preferences: RetailerPreferences;
}) {
  const { t, formatNumber } = useI18n();
  const candidates = items.flatMap((item): BasketCandidate[] => {
    const requiredUnit = normalizePackageUnit(item.unit);
    if (!item.ingredientId || !item.quantity || !requiredUnit) return [];
    return products
      .filter(
        (product) =>
          product.ingredientIds.includes(item.ingredientId!) &&
          preferences.enabledRetailers.includes(product.retailerSlug) &&
          !preferences.excludedBrands.includes(product.brand ?? ""),
      )
      .flatMap((product) => {
        const estimate = estimatePackages(
          product,
          item.quantity!,
          requiredUnit,
          preferences,
        );
        return estimate
          ? [
              {
                itemId: item.id,
                productId: product.id,
                retailerSlug: product.retailerSlug,
                totalCost: estimate.totalCost,
              },
            ]
          : [];
      });
  });
  const cheapestSingle = optimizeBasket(candidates, "single-store");
  const split = preferences.allowSplitBasket
    ? optimizeBasket(candidates, "split")
    : null;
  const preferredCandidates = preferences.preferredRetailer
    ? candidates.filter(
        (candidate) => candidate.retailerSlug === preferences.preferredRetailer,
      )
    : [];
  const preferred = optimizeBasket(preferredCandidates, "single-store");
  const comparableItemCount = new Set(candidates.map((item) => item.itemId))
    .size;

  if (!cheapestSingle && !split && !preferred) return null;
  const formatMoney = (value: number) =>
    `${formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

  return (
    <Card className="overflow-hidden border-primary/25">
      <CardHeader className="border-b border-border/70 bg-primary/5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShoppingBasket
              className="size-5 text-primary"
              aria-hidden="true"
            />
            {t("Basket estimates")}
          </CardTitle>
          <Badge variant="secondary">
            {t("{count} comparable items", { count: comparableItemCount })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 pt-5 sm:grid-cols-3">
        {cheapestSingle && (
          <Estimate
            title={t("Cheapest single store")}
            value={formatMoney(cheapestSingle.total)}
            detail={retailerName(cheapestSingle.retailerSlug)}
          />
        )}
        {preferred && (
          <Estimate
            title={t("Preferred retailer")}
            value={formatMoney(preferred.total)}
            detail={retailerName(preferred.retailerSlug)}
          />
        )}
        {split && (
          <Estimate
            title={t("Cheapest split basket")}
            value={formatMoney(split.total)}
            detail={t("Across enabled retailers")}
          />
        )}
      </CardContent>
      <p className="border-t border-border/70 px-6 py-3 text-xs text-muted-foreground">
        {t(
          "Estimates cover only safely matched items with compatible units. Verify prices and availability in store.",
        )}
      </p>
    </Card>
  );
}

function Estimate({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-background/65 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Store className="size-3.5" aria-hidden="true" />
        {detail}
      </p>
    </div>
  );
}

function retailerName(slug: RetailerProduct["retailerSlug"] | null) {
  if (!slug) return "";
  return slug === "spar-si" ? "SPAR" : slug === "hofer-si" ? "HOFER" : "Lidl";
}
