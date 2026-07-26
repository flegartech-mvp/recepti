import type {
  MatchableRecipe,
  MatcherFilters,
  RecipeMatchResult,
} from "./matcher-types";

export function matchesFilters(
  recipe: MatchableRecipe,
  filters: MatcherFilters | undefined,
): boolean {
  if (!filters) return true;
  const normalizedOptions = (values: readonly string[] | undefined) =>
    new Set((values ?? []).map((value) => value.trim().toLowerCase()));
  const categories = normalizedOptions(filters.categories);
  const difficulties = normalizedOptions(filters.difficulties);
  const dietaryTags = normalizedOptions(filters.dietaryTags);
  if (
    categories.size > 0 &&
    !categories.has(recipe.category?.trim().toLowerCase() ?? "")
  )
    return false;
  if (
    difficulties.size > 0 &&
    !difficulties.has(recipe.difficulty?.trim().toLowerCase() ?? "")
  )
    return false;
  if (
    filters.maxTotalMinutes != null &&
    (recipe.totalMinutes == null ||
      recipe.totalMinutes > filters.maxTotalMinutes)
  )
    return false;
  if (dietaryTags.size > 0) {
    const recipeTags = new Set(
      (recipe.dietaryTags ?? []).map((tag) => tag.trim().toLowerCase()),
    );
    if (![...dietaryTags].every((tag) => recipeTags.has(tag))) return false;
  }
  return true;
}

export function sortAndRankResults(
  entries: Array<{ originalIndex: number; result: RecipeMatchResult }>,
): RecipeMatchResult[] {
  const collator = new Intl.Collator("en", {
    sensitivity: "base",
    numeric: true,
  });
  entries.sort((left, right) => {
    const leftComplete = left.result.category === "ready_to_cook" ? 1 : 0;
    const rightComplete = right.result.category === "ready_to_cook" ? 1 : 0;
    if (leftComplete !== rightComplete) return rightComplete - leftComplete;
    if (left.result.weightedScore !== right.result.weightedScore)
      return right.result.weightedScore - left.result.weightedScore;
    if (
      left.result.unavailableIngredientCount !==
      right.result.unavailableIngredientCount
    )
      return (
        left.result.unavailableIngredientCount -
        right.result.unavailableIngredientCount
      );
    const leftTime =
      left.result.recipe.totalMinutes ?? Number.POSITIVE_INFINITY;
    const rightTime =
      right.result.recipe.totalMinutes ?? Number.POSITIVE_INFINITY;
    if (leftTime !== rightTime) return leftTime - rightTime;
    const titleOrder = collator.compare(
      left.result.recipe.title,
      right.result.recipe.title,
    );
    return titleOrder || left.originalIndex - right.originalIndex;
  });
  return entries.map(({ result }, index) => ({
    ...result,
    rank: index + 1,
    rankingExplanation:
      result.category === "ready_to_cook"
        ? "Complete matches rank first; ties use score, unavailable count, and total time."
        : "Ranked by weighted score, then fewer unavailable ingredients, then shorter total time.",
  }));
}
