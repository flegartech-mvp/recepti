import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Products") };
}

export default async function ProductsPage() {
  const { t } = await getServerI18n();
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title={t("Products")}
        description={t(
          "Retailer catalogues appear here after an authorized import is configured.",
        )}
      />
      <div className="rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
        {t("No retailer catalogue has been imported yet.")}
      </div>
    </PageContainer>
  );
}
