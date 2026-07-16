import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import { getUserSettings, listIngredients } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Add recipe") };
}

export default async function NewRecipePage() {
  const [ingredients, settings, { t }] = await Promise.all([
    listIngredients(),
    getUserSettings(),
    getServerI18n(),
  ]);
  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title={t("Add a recipe")}
        description={t(
          "Capture it once, then let Nana's Recipes help with pantry matching, shopping, scaling, and cooking.",
        )}
      />
      <RecipeEditor
        catalog={ingredients}
        defaultServings={settings.defaultServings}
      />
    </PageContainer>
  );
}
