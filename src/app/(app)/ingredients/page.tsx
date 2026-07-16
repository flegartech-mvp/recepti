import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { IngredientManager } from "@/features/ingredients/components/ingredient-manager";
import { listIngredients } from "@/lib/data/queries";

export const metadata = { title: "Ingredients" };

export default async function IngredientsPage() {
  const ingredients = await listIngredients();
  return (
    <PageContainer>
      <PageHeader
        title="Ingredient catalog"
        description="A clean canonical list keeps recipe matching accurate without flattening meaningful differences."
      />
      <IngredientManager ingredients={ingredients} />
    </PageContainer>
  );
}
