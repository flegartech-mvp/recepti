import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { effectiveOfferPrice } from "@/lib/retailers/pricing";
import type {
  RetailerPreferences,
  RetailerProduct,
} from "@/lib/retailers/types";
import type { Locale } from "@/lib/i18n/config";
import { formatNumber, translate } from "@/lib/i18n/translate";

export function ProductCard({
  product,
  preferences,
  locale,
}: {
  product: RetailerProduct;
  preferences: RetailerPreferences;
  locale: Locale;
}) {
  const current = product.offers
    .map((offer) => ({
      offer,
      effective: effectiveOfferPrice(offer, preferences),
    }))
    .filter((entry) => entry.effective)
    .sort(
      (a, b) =>
        (a.effective?.price ?? Infinity) - (b.effective?.price ?? Infinity),
    )[0];
  const price = current?.effective;
  return (
    <Card
      className="recipe-paper group overflow-hidden"
      data-testid="product-card"
    >
      <div className="product-placeholder relative flex aspect-[16/9] items-center justify-center border-b border-border/80 bg-surface-secondary">
        <Package
          className="size-12 text-primary/65 transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105"
          strokeWidth={1.4}
          aria-hidden="true"
        />
        {product.isDemo && (
          <Badge className="absolute top-3 left-3" variant="secondary">
            {translate(locale, "Demo data")}
          </Badge>
        )}
      </div>
      <CardHeader className="gap-2 pb-3">
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{product.retailerName}</span>
          <span>
            {product.packageText ?? translate(locale, "Unknown package")}
          </span>
        </div>
        <CardTitle className="line-clamp-2 text-xl leading-snug">
          <h2>{product.name}</h2>
        </CardTitle>
        {product.brand && (
          <p className="text-sm text-muted-foreground">{product.brand}</p>
        )}
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4 pb-4">
        <div>
          <p className="text-2xl font-bold text-primary-text">
            {price
              ? `${formatNumber(locale, price.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
              : translate(locale, "Price unavailable")}
          </p>
          {price && (
            <p className="text-xs text-muted-foreground">
              {translate(
                locale,
                price.kind === "promotion"
                  ? "Promotional price"
                  : price.kind === "loyalty"
                    ? "Loyalty price"
                    : "Regular price",
              )}
            </p>
          )}
        </div>
        {product.category && (
          <Badge variant="outline">{product.category}</Badge>
        )}
      </CardContent>
      <CardFooter className="border-t border-border/70 bg-surface-secondary/45 pt-4">
        <Button asChild variant="ghost" className="w-full justify-between">
          <Link href={`/products/${product.id}`}>
            {translate(locale, "View product")}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
