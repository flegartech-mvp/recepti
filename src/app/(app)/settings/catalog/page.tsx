import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";

export default function CatalogueSettingsPage() {
  return <PageContainer className="max-w-3xl">
    <PageHeader title="Catalogue administration" description="This catalogue is deliberately local and hand-curated." />
    <div className="rounded-2xl border border-border bg-card p-6 text-sm leading-6 text-muted-foreground">
      <p>To add, edit, or retire a product, change <code>src/data/grocery-products.ts</code>. Link it to a recipe ingredient with its normalized ingredient slug, package size, and your own reference price.</p>
      <p className="mt-4">There is no importer, scraper, or retailer feed. That keeps this private household tool honest and easy to maintain.</p>
    </div>
  </PageContainer>;
}
