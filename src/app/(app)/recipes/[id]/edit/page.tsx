import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import { getRecipe, listIngredients } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Edit recipe") };
}

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, ingredients, { t }] = await Promise.all([
    getRecipe(id),
    listIngredients(),
    getServerI18n(),
  ]);
  if (!recipe) notFound();
  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title={t("Edit {title}", { title: recipe.title })}
        description={t(
          "Changes update this recipe while keeping its cooking history intact.",
        )}
      />
      <RecipeEditor recipe={recipe} catalog={ingredients} />
    </PageContainer>
  );
}
