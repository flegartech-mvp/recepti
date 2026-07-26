import type { IngredientIdentity } from "./ingredients";
import type { QuantityComparisonStatus } from "./quantities";

export const MATCH_CATEGORIES = [
  "ready_to_cook",
  "almost_ready",
  "possible_with_substitutions",
  "not_enough_ingredients",
] as const;

export type MatchCategory = (typeof MATCH_CATEGORIES)[number];

export interface MatchSubstitution extends IngredientIdentity {
  quantity?: number | null;
  unit?: string | null;
  note?: string | null;
}

export interface MatchRecipeIngredient extends IngredientIdentity {
  quantity?: number | null;
  unit?: string | null;
  isOptional?: boolean;
  isGarnish?: boolean;
  isStaple?: boolean;
  substitutions?: readonly MatchSubstitution[];
}

export interface AvailableIngredient extends IngredientIdentity {
  ingredient?: IngredientIdentity | null;
  quantity?: number | null;
  unit?: string | null;
  isDepleted?: boolean;
}

export interface MatchableRecipe {
  id: string;
  title: string;
  ingredients: readonly MatchRecipeIngredient[];
  totalMinutes?: number | null;
  category?: string | null;
  difficulty?: string | null;
  dietaryTags?: readonly string[];
}

export interface MatcherFilters {
  categories?: readonly string[];
  difficulties?: readonly string[];
  dietaryTags?: readonly string[];
  maxTotalMinutes?: number | null;
}

export type MatcherIdentityOption = string | IngredientIdentity;

export interface MatcherOptions {
  ignoreStaples?: boolean;
  stapleIngredients?: readonly MatcherIdentityOption[];
  excludedIngredients?: readonly MatcherIdentityOption[];
  almostReadyMaxUnavailable?: number;
  almostReadyMinPercentage?: number;
  filters?: MatcherFilters;
}

export type IngredientMatchStatus =
  | "available"
  | "missing"
  | "excluded"
  | "insufficient_quantity"
  | "incompatible_units"
  | "substituted"
  | "ignored_staple"
  | "ignored_optional";

export interface IngredientMatchDetail {
  key: string;
  name: string;
  status: IngredientMatchStatus;
  requiredQuantity: number | null;
  requiredUnit: string | null;
  availableQuantity: number | null;
  availableUnit: string | null;
  quantityStatus: QuantityComparisonStatus | null;
  scoreContribution: number;
  substitution?: {
    name: string;
    note: string | null;
  };
}

export type MatchExplanationCode =
  | "complete_match"
  | "no_required_ingredients"
  | "missing_ingredients"
  | "excluded_ingredients"
  | "insufficient_quantity"
  | "incompatible_units"
  | "unknown_quantities"
  | "optional_ignored"
  | "staples_ignored"
  | "substitutions_used";

export interface MatchExplanation {
  code: MatchExplanationCode;
  message: string;
}

export interface RecipeMatchResult {
  recipe: MatchableRecipe;
  category: MatchCategory;
  matchPercentage: number;
  weightedScore: number;
  matchedIngredientCount: number;
  requiredIngredientCount: number;
  unavailableIngredientCount: number;
  missingIngredients: readonly IngredientMatchDetail[];
  availableIngredients: readonly IngredientMatchDetail[];
  quantityIssues: readonly IngredientMatchDetail[];
  ignoredIngredients: readonly IngredientMatchDetail[];
  substitutionsUsed: readonly IngredientMatchDetail[];
  ingredientDetails: readonly IngredientMatchDetail[];
  reason: string;
  explanations: readonly MatchExplanation[];
  rank: number | null;
  rankingExplanation: string | null;
}
