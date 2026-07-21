import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { groceryProducts, retailerNames } from "@/data/grocery-products";
import { getIngredientDefinition } from "@/data/pantry-starters";
import { normalizeIngredientSearch } from "@/lib/domain/ingredient-search";
import { getServerI18n } from "@/lib/i18n/server";
import { RETAILER_SLUGS, type RetailerSlug } from "@/lib/retailers/types";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Products") };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; retailer?: string }>;
}) {
  const { locale, t, formatNumber } = await getServerI18n();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const normalizedQuery = normalizeIngredientSearch(query);
  const retailer = RETAILER_SLUGS.includes(params.retailer as RetailerSlug)
    ? (params.retailer as RetailerSlug)
    : null;
  const products = groceryProducts.filter((product) => {
    if (retailer && product.retailerSlug !== retailer) return false;
    if (!normalizedQuery) return true;
    const ingredientTerms = product.ingredientSlugs.flatMap((slug) => {
      const ingredient = getIngredientDefinition(slug);
      return ingredient
        ? [ingredient.names.en, ingredient.names.sl, ...ingredient.aliases]
        : [slug];
    });
    return normalizeIngredientSearch(
      [
        product.name,
        product.brand ?? "",
        product.retailerName,
        product.category ?? "",
        ...product.ingredientSlugs,
        ...ingredientTerms,
        ...(product.aliases ?? []),
      ].join(" "),
    ).includes(normalizedQuery);
  });

  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title={t("Product catalogue")}
        description={t(
          "300 verified cooking products from official Slovenian retailer pages. Prices are omitted because offers change frequently.",
        )}
      />
      <form
        className="mb-4 grid gap-2 rounded-2xl border border-border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]"
        action="/products"
      >
        <label className="sr-only" htmlFor="product-search">
          {t("Search by product, brand, category, or EAN")}
        </label>
        <input
          id="product-search"
          name="q"
          defaultValue={query}
          placeholder={t("Search by product, brand, category, or EAN")}
          className="min-h-11 min-w-0 rounded-xl border border-border bg-background px-3 text-base"
        />
        <label className="sr-only" htmlFor="retailer-filter">
          {t("Retailer")}
        </label>
        <select
          id="retailer-filter"
          name="retailer"
          defaultValue={retailer ?? ""}
          className="min-h-11 rounded-xl border border-border bg-background px-3 text-base"
        >
          <option value="">{t("All retailers")}</option>
          {RETAILER_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {retailerNames[slug]}
            </option>
          ))}
        </select>
        <button className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {t("Search")}
        </button>
      </form>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p aria-live="polite">
          {t("{visible} of {total} products", {
            visible: formatNumber(products.length),
            total: formatNumber(groceryProducts.length),
          })}
        </p>
        {(query || retailer) && (
          <Link
            href="/products"
            className="text-primary underline-offset-4 hover:underline"
          >
            {t("Clear filters")}
          </Link>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const ingredient = getIngredientDefinition(
            product.ingredientSlugs[0],
          );
          return (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              data-testid="product-card"
              className="min-w-0 rounded-2xl border border-border bg-card p-5 transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {product.retailerName}
                {product.brand ? ` · ${product.brand}` : ""}
              </p>
              <h2 className="mt-2 font-heading text-xl font-semibold [overflow-wrap:anywhere]">
                {product.name}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {product.unitLabel}
                {ingredient
                  ? ` · ${ingredient.names[locale === "sl" ? "sl" : "en"]}`
                  : ""}
              </p>
              <p className="mt-4 text-sm font-medium text-primary">
                {t("Open details")}
              </p>
            </Link>
          );
        })}
      </div>
      {products.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
          {t("No verified products match these filters.")}
        </p>
      )}
    </PageContainer>
  );
}
