"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/i18n-provider";
import type { ShoppingListItem } from "@/types/domain";
import type {
  RetailerPreferences,
  RetailerProduct,
} from "@/lib/retailers/types";

export function ProductComparisonButton({
  item,
  products,
  preferences,
}: {
  item: ShoppingListItem;
  products: RetailerProduct[];
  preferences: RetailerPreferences;
}) {
  const { t, formatNumber } = useI18n();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const visibleProducts = products.filter(
    (product) => preferences.enabledRetailers.includes(product.retailerSlug) &&
      (preferences.allowLoyaltyPrices || !product.isLoyaltyPrice),
  );
  if (visibleProducts.length === 0) return null;
  const best = visibleProducts
    .filter((product) => product.price !== null)
    .sort(
      (left, right) => (left.price ?? Infinity) - (right.price ?? Infinity),
    )[0];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={t("Compare {name}", { name: item.ingredientName })}>
          {t("Compare")}
          {best?.price !== null && best?.price !== undefined && <Badge variant="secondary">{formatNumber(best.price)} {best.currency}</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Compare products for {item}", { item: item.ingredientName })}</DialogTitle>
          <DialogDescription>Reference products from the catalogues you enabled.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {visibleProducts.map((product) => <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
            <div><p className="font-medium">{product.name}</p><p className="text-sm text-muted-foreground">{product.retailerName} · {product.unitLabel}</p></div>
            <div className="text-right"><p className="font-semibold">€{product.price?.toFixed(2)}</p><Button size="sm" variant={chosenId === product.id ? "secondary" : "outline"} onClick={() => setChosenId(product.id)}>{chosenId === product.id ? "Chosen" : "Choose"}</Button></div>
          </div>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
