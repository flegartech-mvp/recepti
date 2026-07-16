import { matchRecipe } from "@/lib/domain";
import type { AvailableIngredient, MatchableRecipe } from "@/lib/domain";
import type { RecipeSummary } from "@/types/domain";

export function attachMakeabilityToRecipeSummaries(
  summaries: readonly RecipeSummary[],
  recipes: readonly MatchableRecipe[],
  pantry: readonly AvailableIngredient[],
  pantryHasItems = pantry.length > 0,
): RecipeSummary[] {
  if (!pantryHasItems) return [...summaries];

  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));

  return summaries.map((summary) => {
    const recipe = recipesById.get(summary.id);
    if (!recipe) return summary;

    const result = matchRecipe(recipe, pantry);
    return {
      ...summary,
      matchPercentage: result.matchPercentage,
      missingIngredientNames: result.missingIngredients.map(
        (ingredient) => ingredient.name,
      ),
    };
  });
}
