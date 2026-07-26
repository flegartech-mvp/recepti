import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { FirstUseSetup } from "@/features/onboarding/components/first-use-setup";
import { isTestAuthenticationEnabled } from "@/lib/auth/authorization";
import { getDashboardData } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Getting started") };
}

export default async function GettingStartedPage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string }>;
}) {
  const [data, parameters, { t }] = await Promise.all([
    getDashboardData(),
    searchParams,
    getServerI18n(),
  ]);
  const forceFresh = isTestAuthenticationEnabled() && parameters.fresh === "1";

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader
        title={t("Start cooking in a few minutes")}
        description={t(
          "Choose a small recipe shelf and the ingredients you usually keep. Your first real match comes next.",
        )}
      />
      <FirstUseSetup
        includeRecipes={forceFresh || data.recipeCount === 0}
        includePantry={forceFresh || data.pantryCount === 0}
      />
    </PageContainer>
  );
}
