import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/features/retailers/components/product-card";
import { getServerI18n } from "@/lib/i18n/server";
import {
  listRetailerProducts,
  listRetailers,
  getRetailerPreferences,
} from "@/lib/retailers/queries";
import { RETAILER_SLUGS, type RetailerSlug } from "@/lib/retailers/types";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Product catalogue") };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const query =
    typeof parameters.q === "string" ? parameters.q.slice(0, 120) : "";
  const retailer =
    typeof parameters.retailer === "string" &&
    RETAILER_SLUGS.includes(parameters.retailer as RetailerSlug)
      ? (parameters.retailer as RetailerSlug)
      : undefined;
  const page =
    typeof parameters.page === "string"
      ? Math.max(1, Number(parameters.page) || 1)
      : 1;
  const promotion = parameters.promotion === "1";
  const [{ products, total, pageSize }, retailers, preferences, { t, locale }] =
    await Promise.all([
      listRetailerProducts({ query, retailer, promotion, page }),
      listRetailers(),
      getRetailerPreferences(),
      getServerI18n(),
    ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (target: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (retailer) next.set("retailer", retailer);
    if (promotion) next.set("promotion", "1");
    next.set("page", String(target));
    return `/products?${next}`;
  };
  return (
    <div className="page-kitchen mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-10 lg:py-9">
      <section className="catalogue-hero mb-7 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[0_18px_55px_var(--shadow)] sm:p-7">
        <div className="relative z-10 max-w-3xl">
          <p className="kitchen-note">{t("Prices for the next family meal")}</p>
          <h1 className="mt-2 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            {t("Product catalogue")}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t(
              "Compare fictional demo products now, then connect authorized Slovenian retailer feeds when access is available.",
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {retailers.map((item) => (
              <Badge
                key={item.slug}
                variant={retailer === item.slug ? "default" : "secondary"}
              >
                {item.displayName}
              </Badge>
            ))}
          </div>
        </div>
      </section>
      <form
        className="mb-7 grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto]"
        method="get"
      >
        <label className="relative block">
          <span className="sr-only">{t("Search products")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            name="q"
            defaultValue={query}
            placeholder={t("Search by product, brand, category, or EAN")}
            className="min-h-11 pl-10"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          <span className="sr-only">{t("Retailer")}</span>
          <select
            name="retailer"
            defaultValue={retailer ?? ""}
            className="min-w-40 bg-transparent outline-none"
          >
            <option value="">{t("All retailers")}</option>
            {retailers.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.displayName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <Button type="submit">{t("Search")}</Button>
          <Button asChild variant="outline">
            <Link href="/settings/catalog">{t("Manage catalogue")}</Link>
          </Button>
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm md:col-span-3">
          <input
            type="checkbox"
            name="promotion"
            value="1"
            defaultChecked={promotion}
            className="size-4 accent-primary"
          />
          {t("Only products with special prices")}
        </label>
      </form>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {t("{count} products", { count: total })}
        </p>
        {products.some((product) => product.isDemo) && (
          <Badge variant="outline">{t("Fixture-backed catalogue")}</Badge>
        )}
      </div>
      {products.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              preferences={preferences}
              locale={locale}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title={t("No products found")}
          description={t(
            "Change the search or retailer filters and try again.",
          )}
        />
      )}
      {totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-center gap-3"
          aria-label={t("Product pages")}
        >
          <Button asChild variant="outline" aria-disabled={page <= 1}>
            <Link href={pageHref(Math.max(1, page - 1))}>{t("Previous")}</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            {t("Page {page} of {total}", { page, total: totalPages })}
          </span>
          <Button asChild variant="outline" aria-disabled={page >= totalPages}>
            <Link href={pageHref(Math.min(totalPages, page + 1))}>
              {t("Next")}
            </Link>
          </Button>
        </nav>
      )}
      <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
        {t(
          "Travel costs are not included. Store availability and promotional conditions may differ. Prices can change after the recorded observation.",
        )}
      </p>
    </div>
  );
}
