import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { RecipeMatcher } from "@/features/matcher/components/recipe-matcher";
import {
  listIngredients,
  listPantry,
  listRecipesForMatching,
} from "@/lib/data/queries";

export const metadata = { title: "What can I cook?" };

export default async function RecipeMatcherPage() {
  const [recipes, pantry, ingredients] = await Promise.all([
    listRecipesForMatching(),
    listPantry(),
    listIngredients(),
  ]);
  return (
    <PageContainer>
      <PageHeader
        title="What can I cook?"
        description="Choose what is available and get a deterministic, quantity-aware ranking with honest missing-ingredient details."
      />
      <RecipeMatcher recipes={recipes} pantry={pantry} catalog={ingredients} />
    </PageContainer>
  );
}
