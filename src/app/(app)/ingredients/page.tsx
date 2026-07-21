import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { IngredientManager } from "@/features/ingredients/components/ingredient-manager";
import { listIngredients } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Ingredients") };
}

export default async function IngredientsPage() {
  const [ingredients, { t }] = await Promise.all([
    listIngredients(),
    getServerI18n(),
  ]);
  return (
    <PageContainer>
      <PageHeader
        title={t("Ingredient catalog")}
        description={t(
          "A clean canonical list keeps recipe matching accurate without flattening meaningful differences.",
        )}
      />
      <IngredientManager ingredients={ingredients} />
    </PageContainer>
  );
}
