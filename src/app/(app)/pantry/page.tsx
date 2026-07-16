import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { PantryManager } from "@/features/pantry/components/pantry-manager";
import { listIngredients, listPantry } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Pantry") };
}

export default async function PantryPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const [items, ingredients, parameters, { t }] = await Promise.all([
    listPantry(),
    listIngredients(),
    searchParams,
    getServerI18n(),
  ]);
  return (
    <PageContainer>
      <PageHeader
        title={t("Pantry and fridge")}
        description={t(
          "Keep an honest view of what is available, low, or close to its expiration date.",
        )}
      />
      <PantryManager
        items={items}
        catalog={ingredients}
        initialOpen={parameters.add === "1"}
      />
    </PageContainer>
  );
}
