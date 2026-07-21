import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeMatcher } from "@/features/matcher/components/recipe-matcher";
import {
  listIngredients,
  listPantry,
  listRecipesForMatching,
} from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("What can I cook?") };
}

export default async function RecipeMatcherPage() {
  const [recipes, pantry, ingredients, { t }] = await Promise.all([
    listRecipesForMatching(),
    listPantry(),
    listIngredients(),
    getServerI18n(),
  ]);
  return (
    <PageContainer>
      <PageHeader
        title={t("What can I cook?")}
        description={t(
          "Choose what is available and get a deterministic, quantity-aware ranking with honest missing-ingredient details.",
        )}
      />
      <RecipeMatcher recipes={recipes} pantry={pantry} catalog={ingredients} />
    </PageContainer>
  );
}
