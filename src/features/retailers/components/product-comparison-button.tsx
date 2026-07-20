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
import { rankRetailerProducts } from "@/lib/retailers/matching";

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
  const visibleProducts = rankRetailerProducts(products, preferences, item);
  if (visibleProducts.length === 0) return null;
  const best = visibleProducts.find((product) => product.price !== null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t("Compare {name}", { name: item.ingredientName })}
        >
          {t("Compare")}
          {best?.price !== null && best?.price !== undefined && (
            <Badge variant="secondary">
              {formatNumber(best.price)} {best.currency}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("Compare products for {item}", { item: item.ingredientName })}
          </DialogTitle>
          <DialogDescription>
            {t("Reference products from the catalogues you enabled.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {visibleProducts.map((product) => (
            <div
              key={product.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="min-w-0">
                <p className="font-medium [overflow-wrap:anywhere]">
                  {product.name}
                </p>
                <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">
                  {product.retailerName}
                  {product.brand ? ` · ${product.brand}` : ""}
                  {product.unitLabel ? ` · ${product.unitLabel}` : ""}
                </p>
                {product.sourceUrl && (
                  <a
                    className="text-xs text-primary underline-offset-4 hover:underline"
                    href={product.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Official source")}
                  </a>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold">
                  {product.price === null
                    ? t("No current price")
                    : `€${product.price.toFixed(2)}`}
                </p>
                <Button
                  size="sm"
                  variant={chosenId === product.id ? "secondary" : "outline"}
                  onClick={() => setChosenId(product.id)}
                >
                  {t(chosenId === product.id ? "Chosen" : "Choose")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
