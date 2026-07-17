import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { CatalogAdminPanel } from "@/features/retailers/components/catalog-admin-panel";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Catalogue administration") };
}

export default async function CatalogSettingsPage() {
  const { t } = await getServerI18n();
  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title={t("Catalogue administration")}
        description={t(
          "Review retailer feeds, validate imports, and keep uncertain matches under owner control.",
        )}
      />
      <CatalogAdminPanel />
    </PageContainer>
  );
}
