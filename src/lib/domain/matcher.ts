import {
  detailForDirectMatch,
  findSubstitution,
  groupRequirements,
  identityIntersectsTokens,
  indexAvailableIngredients,
  optionTokens,
  requiredLines,
  summedRequiredQuantity,
  type AvailableIngredientIndex,
} from "./matcher-availability";
import { buildExplanations, resultReason } from "./matcher-explanations";
import { matchesFilters, sortAndRankResults } from "./matcher-ranking";
import { ingredientDisplayName } from "./ingredients";
import type {
  AvailableIngredient,
  IngredientMatchDetail,
  IngredientMatchStatus,
  MatchableRecipe,
  MatchCategory,
  MatcherOptions,
  RecipeMatchResult,
} from "./matcher-types";

export * from "./matcher-types";

const DEFAULT_STAPLES = ["salt", "black pepper", "water", "cooking oil"];

export function matchRecipe(
  recipe: MatchableRecipe,
  availableIngredients: readonly AvailableIngredient[],
  options: MatcherOptions = {},
): RecipeMatchResult {
  return matchRecipeWithIndex(
    recipe,
    indexAvailableIngredients(availableIngredients),
    options,
  );
}

function matchRecipeWithIndex(
  recipe: MatchableRecipe,
  availableIndex: AvailableIngredientIndex,
  options: MatcherOptions,
): RecipeMatchResult {
  const excludedTokens = optionTokens(options.excludedIngredients);
  const stapleTokens = optionTokens([
    ...DEFAULT_STAPLES,
    ...(options.stapleIngredients ?? []),
  ]);
  const groups = groupRequirements(recipe.ingredients);
  const details: IngredientMatchDetail[] = [];

  for (const group of groups) {
    const coreLines = requiredLines(group);
    const required = summedRequiredQuantity(coreLines);
    if (coreLines.length === 0) {
      details.push({
        key: group.key,
        name: ingredientDisplayName(group.representative),
        status: "ignored_optional",
        requiredQuantity: null,
        requiredUnit: null,
        availableQuantity: null,
        availableUnit: null,
        quantityStatus: null,
        scoreContribution: 0,
      });
      continue;
    }
    if (
      options.ignoreStaples &&
      (group.representative.isStaple ||
        identityIntersectsTokens(group.representative, stapleTokens))
    ) {
      details.push({
        key: group.key,
        name: ingredientDisplayName(group.representative),
        status: "ignored_staple",
        requiredQuantity: required.quantity,
        requiredUnit: required.unit,
        availableQuantity: null,
        availableUnit: null,
        quantityStatus: null,
        scoreContribution: 0,
      });
      continue;
    }
    if (identityIntersectsTokens(group.representative, excludedTokens)) {
      details.push({
        key: group.key,
        name: ingredientDisplayName(group.representative),
        status: "excluded",
        requiredQuantity: required.quantity,
        requiredUnit: required.unit,
        availableQuantity: null,
        availableUnit: null,
        quantityStatus: null,
        scoreContribution: 0,
      });
      continue;
    }
    const direct = detailForDirectMatch(group, availableIndex);
    if (direct) {
      details.push(direct);
      continue;
    }
    const substitution = findSubstitution(group, availableIndex);
    if (substitution) {
      details.push(substitution);
      continue;
    }
    details.push({
      key: group.key,
      name: ingredientDisplayName(group.representative),
      status: "missing",
      requiredQuantity: required.quantity,
      requiredUnit: required.unit,
      availableQuantity: null,
      availableUnit: null,
      quantityStatus: null,
      scoreContribution: 0,
    });
  }

  const requiredDetails = details.filter(
    (detail) =>
      detail.status !== "ignored_optional" &&
      detail.status !== "ignored_staple",
  );
  const requiredCount = requiredDetails.length;
  const weightedScore =
    requiredCount === 0
      ? 1
      : requiredDetails.reduce(
          (sum, detail) => sum + detail.scoreContribution,
          0,
        ) / requiredCount;
  const matchPercentage = Math.round(
    Math.min(1, Math.max(0, weightedScore)) * 100,
  );
  const unresolvedStatuses: readonly IngredientMatchStatus[] = [
    "missing",
    "excluded",
    "insufficient_quantity",
    "incompatible_units",
  ];
  const unresolved = requiredDetails.filter((detail) =>
    unresolvedStatuses.includes(detail.status),
  );
  const substitutions = requiredDetails.filter(
    (detail) => detail.status === "substituted",
  );
  const maxUnavailable = Math.max(0, options.almostReadyMaxUnavailable ?? 2);
  const minimumPercentage = Math.min(
    100,
    Math.max(0, options.almostReadyMinPercentage ?? 50),
  );
  let category: MatchCategory;
  if (unresolved.length === 0 && substitutions.length === 0)
    category = "ready_to_cook";
  else if (unresolved.length === 0) category = "possible_with_substitutions";
  else if (
    unresolved.length <= maxUnavailable &&
    matchPercentage >= minimumPercentage
  )
    category = "almost_ready";
  else category = "not_enough_ingredients";

  const available = requiredDetails.filter((detail) =>
    ["available", "incompatible_units", "insufficient_quantity"].includes(
      detail.status,
    ),
  );
  const missing = unresolved.filter(
    (detail) => detail.status !== "incompatible_units",
  );
  const quantityIssues = requiredDetails.filter((detail) =>
    ["insufficient_quantity", "incompatible_units"].includes(detail.status),
  );
  const ignored = details.filter((detail) =>
    ["ignored_optional", "ignored_staple"].includes(detail.status),
  );
  return {
    recipe,
    category,
    matchPercentage,
    weightedScore,
    matchedIngredientCount: available.length,
    requiredIngredientCount: requiredCount,
    unavailableIngredientCount: unresolved.length,
    missingIngredients: missing,
    availableIngredients: available,
    quantityIssues,
    ignoredIngredients: ignored,
    substitutionsUsed: substitutions,
    ingredientDetails: details,
    reason: resultReason(category, requiredCount, details),
    explanations: buildExplanations(requiredCount, details),
    rank: null,
    rankingExplanation: null,
  };
}

export function rankRecipes(
  recipes: readonly MatchableRecipe[],
  availableIngredients: readonly AvailableIngredient[],
  options: MatcherOptions = {},
): RecipeMatchResult[] {
  const availableIndex = indexAvailableIngredients(availableIngredients);
  return sortAndRankResults(
    recipes
      .filter((recipe) => matchesFilters(recipe, options.filters))
      .map((recipe, originalIndex) => ({
        originalIndex,
        result: matchRecipeWithIndex(recipe, availableIndex, options),
      })),
  );
}

export const matchRecipes = rankRecipes;
