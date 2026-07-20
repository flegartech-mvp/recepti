import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getGroceryProduct } from "@/data/grocery-products";
import { getIngredientDefinition } from "@/data/pantry-starters";
import { getServerI18n } from "@/lib/i18n/server";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { locale, t } = await getServerI18n();
  const product = getGroceryProduct((await params).id);
  if (!product) notFound();
  const ingredient = getIngredientDefinition(product.ingredientSlugs[0]);

  return (
    <PageContainer className="max-w-3xl">
      <Link
        href="/products"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        {t("Back to products")}
      </Link>
      <PageHeader
        title={product.name}
        description={`${product.retailerName}${product.brand ? ` · ${product.brand}` : ""} · ${product.unitLabel}`}
      />
      <article className="rounded-2xl border border-border bg-card p-6">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("Canonical ingredient")}
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {ingredient?.names[locale === "sl" ? "sl" : "en"] ??
                product.ingredientSlugs[0]}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("Package")}</dt>
            <dd className="mt-1 text-lg font-semibold">{product.unitLabel}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">{t("Price")}</dt>
            <dd className="mt-1 text-lg font-semibold">{t("Not stored")}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">
              {t("Source checked")}
            </dt>
            <dd className="mt-1 text-lg font-semibold">
              {product.sourceCheckedAt}
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          {ingredient && (
            <Link
              href={`/ingredients?q=${encodeURIComponent(ingredient.names[locale === "sl" ? "sl" : "en"])}`}
              className="min-h-11 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary"
            >
              {t("Find ingredient")}
            </Link>
          )}
          {product.sourceUrl && (
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="min-h-11 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {t("Open official product page")}
            </a>
          )}
        </div>
        <p className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">
          {t(
            "This is a curated reference, not a live stock or price feed. Verify availability on the retailer page before shopping.",
          )}
        </p>
      </article>
    </PageContainer>
  );
}
