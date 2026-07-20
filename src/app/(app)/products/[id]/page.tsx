import { notFound } from "next/navigation";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getGroceryProduct } from "@/data/grocery-products";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const product = getGroceryProduct((await params).id);
  if (!product) notFound();
  return <PageContainer className="max-w-3xl">
    <Link href="/products" className="text-sm text-primary underline-offset-4 hover:underline">Back to products</Link>
    <PageHeader title={product.name} description={`${product.retailerName} · ${product.unitLabel}`} />
    <article className="rounded-2xl border border-border bg-card p-6">
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Your reference price</dt><dd className="text-xl font-semibold">€{product.price?.toFixed(2)}</dd></div><div><dt className="text-sm text-muted-foreground">Package</dt><dd className="text-xl font-semibold">{product.packageQuantity} {product.packageUnit}</dd></div></dl>
      <p className="mt-6 rounded-xl bg-muted p-4 text-sm text-muted-foreground">Availability and price are not live. Update this household catalogue when you want; no retailer partnership is implied.</p>
    </article>
  </PageContainer>;
}
