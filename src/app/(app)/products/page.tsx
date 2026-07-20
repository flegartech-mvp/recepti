import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { groceryProducts } from "@/data/grocery-products";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Products") };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { t } = await getServerI18n();
  const query = ((await searchParams).q ?? "").trim().toLocaleLowerCase();
  const products = groceryProducts.filter((product) =>
    !query || [product.name, product.retailerName, ...product.ingredientSlugs]
      .join(" ").toLocaleLowerCase().includes(query),
  );
  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title={t("Product catalogue")} description="A small household catalogue you control in code. Prices are your own reference values, not live retailer data." />
      <form className="mb-6 flex gap-2" action="/products">
        <input name="q" defaultValue={query} placeholder={t("Search by product, brand, category, or EAN")} className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3 text-sm" />
        <button className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">{t("Search")}</button>
      </form>
      <p className="mb-4 text-sm text-muted-foreground">Curated catalogue · {products.length} products</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link key={product.id} href={`/products/${product.id}`} data-testid="product-card" className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{product.retailerName}</p>
            <h2 className="mt-2 font-heading text-xl font-semibold">{product.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{product.unitLabel}</p>
            <p className="mt-4 font-semibold">€{product.price?.toFixed(2) ?? "—"}</p>
          </Link>
        ))}
      </div>
      {products.length === 0 && <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">No products found. Add a product in <code>src/data/grocery-products.ts</code>.</p>}
    </PageContainer>
  );
}
