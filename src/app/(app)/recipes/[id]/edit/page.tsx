import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import { getRecipe, listIngredients } from "@/lib/data/queries";

export const metadata = { title: "Edit recipe" };

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, ingredients] = await Promise.all([
    getRecipe(id),
    listIngredients(),
  ]);
  if (!recipe) notFound();
  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title={`Edit ${recipe.title}`}
        description="Changes update this recipe while keeping its cooking history intact."
      />
      <RecipeEditor recipe={recipe} catalog={ingredients} />
    </PageContainer>
  );
}
