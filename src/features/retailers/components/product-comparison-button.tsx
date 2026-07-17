"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Scale, Store } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
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
import { selectShoppingProductAction } from "@/features/retailers/actions";
import { normalizePackageUnit } from "@/lib/retailers/normalization";
import { effectiveOfferPrice, estimatePackages } from "@/lib/retailers/pricing";
import type {
  RetailerPreferences,
  RetailerProduct,
} from "@/lib/retailers/types";
import type { ShoppingListItem } from "@/types/domain";

export function ProductComparisonButton({
  item,
  products,
  preferences,
}: {
  item: ShoppingListItem;
  products: RetailerProduct[];
  preferences: RetailerPreferences;
}) {
  const { t, formatNumber, formatDate } = useI18n();
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const requiredUnit = normalizePackageUnit(item.unit);
  const compatible = products
    .filter(
      (product) => !preferences.excludedBrands.includes(product.brand ?? ""),
    )
    .map((product) => {
      const estimate =
        item.quantity && requiredUnit
          ? estimatePackages(product, item.quantity, requiredUnit, preferences)
          : null;
      const current =
        product.offers
          .map((offer) => effectiveOfferPrice(offer, preferences))
          .filter((price): price is NonNullable<typeof price> => Boolean(price))
          .sort((a, b) => a.price - b.price)[0] ?? null;
      return { product, estimate, current };
    })
    .sort(
      (a, b) =>
        (a.estimate?.totalCost ?? a.current?.price ?? Infinity) -
        (b.estimate?.totalCost ?? b.current?.price ?? Infinity),
    );
  if (!products.length) return null;
  const choose = (productId: string) => {
    setSelected(productId);
    startTransition(async () => {
      const result = await selectShoppingProductAction(item.id, productId);
      if (!result.ok) {
        setSelected(null);
        toast.error(t("Product selection could not be saved"));
      } else toast.success(t("Preferred product saved"));
    });
  };
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="shrink-0">
          <Scale className="size-4" aria-hidden="true" />
          {t("Compare prices")}
        </Button>
      </DialogTrigger>
      <DialogContent className="viewport-dialog max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("Compare products for {item}", { item: item.ingredientName })}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Package estimates use only compatible mass, volume, or piece units.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {compatible.map(({ product, estimate, current }) => (
            <article
              key={product.id}
              className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    <Store className="mr-1 size-3" aria-hidden="true" />
                    {product.retailerName}
                  </Badge>
                  {current && (
                    <Badge variant="outline">
                      {t(
                        current.kind === "promotion"
                          ? "Promotion"
                          : current.kind === "loyalty"
                            ? "Loyalty"
                            : "Regular",
                      )}
                    </Badge>
                  )}
                </div>
                <h3 className="mt-2 font-semibold">{product.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.packageText ?? t("Unknown package")}{" "}
                  {product.brand ? `- ${product.brand}` : ""}
                </p>
                <p className="mt-2 text-sm">
                  {estimate
                    ? t("{packages} packages, {total} total, {excess} excess", {
                        packages: estimate.packages,
                        total: `${formatNumber(estimate.totalCost, { minimumFractionDigits: 2 })} €`,
                        excess: formatNumber(estimate.excessQuantity),
                      })
                    : current
                      ? t(
                          "{price} per package. Required quantity cannot be compared safely.",
                          {
                            price: `${formatNumber(current.price, { minimumFractionDigits: 2 })} €`,
                          },
                        )
                      : t("Price unavailable")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Last updated {date}", {
                    date: formatDate(product.lastSeenAt),
                  })}{" "}
                  ·{" "}
                  {t("Match confidence {value}%", {
                    value: formatNumber((product.matchConfidence ?? 0) * 100, {
                      maximumFractionDigits: 0,
                    }),
                  })}
                </p>
              </div>
              <div className="flex gap-2 sm:flex-col">
                <Button
                  size="sm"
                  onClick={() => choose(product.id)}
                  disabled={pending || selected === product.id}
                >
                  {selected === product.id ? (
                    <Check className="size-4" />
                  ) : null}
                  {t(selected === product.id ? "Selected" : "Choose")}
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/products/${product.id}`}>{t("Details")}</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t(
            "Travel cost is not included. Availability is unknown unless a reliable store-level source is connected. Promotional conditions may apply.",
          )}
        </p>
      </DialogContent>
    </Dialog>
  );
}
