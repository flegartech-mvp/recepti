import Link from "next/link";
import { ArrowLeft, ExternalLink, Package } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerI18n } from "@/lib/i18n/server";
import { effectiveOfferPrice } from "@/lib/retailers/pricing";
import {
  getRetailerPreferences,
  getRetailerProduct,
} from "@/lib/retailers/queries";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, preferences, { t, formatDate, formatNumber }] =
    await Promise.all([
      getRetailerProduct(id),
      getRetailerPreferences(),
      getServerI18n(),
    ]);
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
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-10">
      <Button asChild variant="ghost" className="mb-4">
        <Link href="/products">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("Back to products")}
        </Link>
      </Button>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="product-placeholder flex min-h-72 items-center justify-center rounded-2xl border border-border bg-surface-secondary">
          <Package
            className="size-24 text-primary/60"
            strokeWidth={1.2}
            aria-hidden="true"
          />
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{product.retailerName}</Badge>
            {product.isDemo && (
              <Badge variant="secondary">{t("Demo data")}</Badge>
            )}
            {!product.active && (
              <Badge variant="destructive">{t("Inactive product")}</Badge>
            )}
          </div>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {product.name}
          </h1>
          {product.brand && (
            <p className="mt-2 text-lg text-muted-foreground">
              {product.brand}
            </p>
          )}
          <p className="mt-5 leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("Current price")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary-text">
                  {current?.effective
                    ? `${formatNumber(current.effective.price, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                    : t("Price unavailable")}
                </p>
                {current?.effective && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      current.effective.kind === "promotion"
                        ? "Promotional price"
                        : current.effective.kind === "loyalty"
                          ? "Loyalty price"
                          : "Regular price",
                    )}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("Package size")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {product.packageText ?? t("Unknown package")}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.category ?? t("Uncategorized")}
                </p>
              </CardContent>
            </Card>
          </div>
          <dl className="mt-6 grid gap-x-6 gap-y-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{t("EAN")}</dt>
              <dd className="mt-1 font-medium">
                {product.ean ?? t("Not provided")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("Last updated")}
              </dt>
              <dd className="mt-1 font-medium">
                {formatDate(product.lastSeenAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("Match confidence")}
              </dt>
              <dd className="mt-1 font-medium">
                {product.matchConfidence === null
                  ? t("Not matched")
                  : `${formatNumber(product.matchConfidence * 100, { maximumFractionDigits: 0 })}%`}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">
                {t("Availability")}
              </dt>
              <dd className="mt-1 font-medium">{t("Unknown availability")}</dd>
            </div>
          </dl>
          {product.sourceUrl && (
            <Button asChild className="mt-6">
              <a href={product.sourceUrl} target="_blank" rel="noreferrer">
                {t("Open official source")}
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
