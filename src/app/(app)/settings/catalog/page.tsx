import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getServerI18n } from "@/lib/i18n/server";

export default async function CatalogueSettingsPage() {
  const { t } = await getServerI18n();
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title={t("Catalogue administration")}
        description={t(
          "The retailer catalogue is local, source-linked, and validated during every release.",
        )}
      />
      <div className="rounded-2xl border border-border bg-card p-6 text-sm leading-6 text-muted-foreground">
        <p>
          {t(
            "Products are maintained by retailer in {path}. Every row links to an official public product page and a stable canonical ingredient.",
            { path: "src/data/retailers" },
          )}
        </p>
        <p className="mt-4">
          {t(
            "Run {command} after an update. It checks retailer and product IDs, package quantities and units, ingredient identities, source domains, verification dates, and suspicious duplicates.",
            { command: "pnpm catalog:validate" },
          )}
        </p>
        <p className="mt-4">
          {t(
            "Prices are intentionally omitted until a reliable refresh process exists. The app does not imply that a saved product is currently stocked or promoted.",
          )}
        </p>
      </div>
    </PageContainer>
  );
}
