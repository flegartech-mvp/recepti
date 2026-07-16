import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeEditor } from "@/features/recipes/components/recipe-editor";
import { getUserSettings, listIngredients } from "@/lib/data/queries";

export const metadata = { title: "Add recipe" };

export default async function NewRecipePage() {
  const [ingredients, settings] = await Promise.all([
    listIngredients(),
    getUserSettings(),
  ]);
  return (
    <PageContainer className="max-w-6xl">
      <PageHeader
        title="Add a recipe"
        description="Capture it once, then let Nana's Recipes help with pantry matching, shopping, scaling, and cooking."
      />
      <RecipeEditor
        catalog={ingredients}
        defaultServings={settings.defaultServings}
      />
    </PageContainer>
  );
}
