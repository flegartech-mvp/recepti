import {
  ingredientDisplayName,
  ingredientIdentityKey,
  ingredientIdentityTokens,
  ingredientsShareIdentity,
  normalizeIngredientName,
  type IngredientIdentity,
} from "./ingredients";
import {
  compareQuantities,
  convertQuantity,
  normalizeUnit,
  type QuantityComparison,
  type QuantityComparisonStatus,
} from "./quantities";

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
  /** Shared PantryItem objects expose names through this nested catalog record. */
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

interface RequirementGroup {
  key: string;
  representative: MatchRecipeIngredient;
  lines: MatchRecipeIngredient[];
}

interface AggregatedQuantity {
  quantity: number | null;
  unit: string | null;
  status: QuantityComparisonStatus;
  comparison: QuantityComparison | null;
}

const DEFAULT_STAPLES = ["salt", "black pepper", "water", "cooking oil"];

function optionTokens(
  options: readonly MatcherIdentityOption[] | undefined,
): Set<string> {
  const tokens = new Set<string>();

  for (const option of options ?? []) {
    if (typeof option === "string") {
      const trimmed = option.trim();
      if (!trimmed) {
        continue;
      }

      if (trimmed.startsWith("id:") || trimmed.startsWith("name:")) {
        tokens.add(trimmed.toLowerCase());
      } else {
        tokens.add(`id:${trimmed.toLowerCase()}`);
        tokens.add(`name:${normalizeIngredientName(trimmed)}`);
      }
    } else {
      for (const token of ingredientIdentityTokens(option)) {
        tokens.add(token);
      }
    }
  }

  return tokens;
}

function identityIntersectsTokens(
  ingredient: IngredientIdentity,
  tokens: ReadonlySet<string>,
): boolean {
  return ingredientIdentityTokens(ingredient).some((token) =>
    tokens.has(token),
  );
}

function groupRequirements(
  ingredients: readonly MatchRecipeIngredient[],
): RequirementGroup[] {
  const groups = new Map<string, RequirementGroup>();

  for (const ingredient of ingredients) {
    const key = ingredientIdentityKey(ingredient);
    const existing = groups.get(key);
    if (existing) {
      existing.lines.push(ingredient);
    } else {
      groups.set(key, {
        key,
        representative: ingredient,
        lines: [ingredient],
      });
    }
  }

  return [...groups.values()];
}

function requiredLines(group: RequirementGroup): MatchRecipeIngredient[] {
  return group.lines.filter((line) => !line.isOptional && !line.isGarnish);
}

function candidatesFor(
  ingredient: MatchRecipeIngredient | MatchSubstitution,
  available: readonly AvailableIngredient[],
): AvailableIngredient[] {
  return available.filter(
    (candidate) =>
      !candidate.isDepleted &&
      ingredientsShareIdentity(ingredient, availableIdentity(candidate)),
  );
}

function availableIdentity(candidate: AvailableIngredient): IngredientIdentity {
  if (!candidate.ingredient) {
    return candidate;
  }

  return {
    ...candidate.ingredient,
    ingredientId:
      candidate.ingredientId ??
      candidate.ingredient.ingredientId ??
      candidate.ingredient.id,
  };
}

function aggregateComparison(
  requirements: readonly Pick<MatchRecipeIngredient, "quantity" | "unit">[],
  candidates: readonly AvailableIngredient[],
): AggregatedQuantity {
  const quantifiedRequirements = requirements.filter(
    (line): line is MatchRecipeIngredient & { quantity: number } =>
      line.quantity != null,
  );

  if (quantifiedRequirements.length === 0) {
    return {
      quantity: null,
      unit: null,
      status: "not_applicable",
      comparison: null,
    };
  }

  // An unknown pantry quantity intentionally falls back to identity-only matching.
  // This is different from a known zero, which is correctly treated as a shortage.
  if (candidates.some((candidate) => candidate.quantity == null)) {
    return {
      quantity: null,
      unit: normalizeUnit(quantifiedRequirements[0].unit),
      status: "unknown",
      comparison: null,
    };
  }

  const comparisonUnit = normalizeUnit(quantifiedRequirements[0].unit);
  let totalRequired = 0;

  for (const requirement of quantifiedRequirements) {
    const converted = convertQuantity(
      requirement.quantity,
      requirement.unit,
      comparisonUnit,
    );

    // Duplicate recipe rows with incompatible units cannot be safely collapsed.
    // We preserve the identity match but block the stronger "ready" claim.
    if (converted == null) {
      return {
        quantity: null,
        unit: comparisonUnit,
        status: "incompatible",
        comparison: null,
      };
    }

    totalRequired += converted;
  }

  let totalAvailable = 0;
  let hasIncompatibleCandidate = false;
  let firstAvailableUnit: string | null = null;

  for (const candidate of candidates) {
    if (candidate.quantity == null) {
      continue;
    }

    firstAvailableUnit ??= normalizeUnit(candidate.unit);
    const converted = convertQuantity(
      candidate.quantity,
      candidate.unit,
      comparisonUnit,
    );
    if (converted == null) {
      hasIncompatibleCandidate = true;
    } else {
      totalAvailable += converted;
    }
  }

  const comparison = compareQuantities(
    totalRequired,
    comparisonUnit,
    totalAvailable,
    comparisonUnit,
  );

  // Compatible pantry rows can prove sufficiency even if another duplicate row
  // uses an incompatible unit. If they cannot, the incompatible amount means the
  // true total is unknowable rather than definitely insufficient.
  if (comparison.status === "insufficient" && hasIncompatibleCandidate) {
    return {
      quantity: totalAvailable,
      unit: firstAvailableUnit,
      status: "incompatible",
      comparison: null,
    };
  }

  return {
    quantity: totalAvailable,
    unit: comparisonUnit,
    status: comparison.status,
    comparison,
  };
}

function summedRequiredQuantity(
  requirements: readonly MatchRecipeIngredient[],
): { quantity: number | null; unit: string | null } {
  const withQuantity = requirements.filter(
    (line): line is MatchRecipeIngredient & { quantity: number } =>
      line.quantity != null,
  );

  if (withQuantity.length === 0) {
    return { quantity: null, unit: null };
  }

  const unit = normalizeUnit(withQuantity[0].unit);
  let quantity = 0;
  for (const line of withQuantity) {
    const converted = convertQuantity(line.quantity, line.unit, unit);
    if (converted == null) {
      return { quantity: null, unit };
    }
    quantity += converted;
  }

  return { quantity, unit };
}

function displayName(group: RequirementGroup): string {
  return ingredientDisplayName(group.representative);
}

function detailForDirectMatch(
  group: RequirementGroup,
  candidates: readonly AvailableIngredient[],
): IngredientMatchDetail {
  const required = requiredLines(group);
  const requiredTotal = summedRequiredQuantity(required);
  const quantity = aggregateComparison(required, candidates);
  const availableUnit = quantity.unit ?? normalizeUnit(candidates[0]?.unit);

  if (quantity.status === "insufficient") {
    return {
      key: group.key,
      name: displayName(group),
      status: "insufficient_quantity",
      requiredQuantity: requiredTotal.quantity,
      requiredUnit: requiredTotal.unit,
      availableQuantity: quantity.quantity,
      availableUnit,
      quantityStatus: quantity.status,
      scoreContribution: Math.min(
        1,
        Math.max(0, quantity.comparison?.ratio ?? 0),
      ),
    };
  }

  if (quantity.status === "incompatible") {
    return {
      key: group.key,
      name: displayName(group),
      status: "incompatible_units",
      requiredQuantity: requiredTotal.quantity,
      requiredUnit: requiredTotal.unit,
      availableQuantity: candidates[0]?.quantity ?? null,
      availableUnit: normalizeUnit(candidates[0]?.unit),
      quantityStatus: quantity.status,
      // The ingredient identity matches, so it earns identity credit. Readiness
      // remains blocked because exact sufficiency would be an unjustified claim.
      scoreContribution: 1,
    };
  }

  return {
    key: group.key,
    name: displayName(group),
    status: "available",
    requiredQuantity: requiredTotal.quantity,
    requiredUnit: requiredTotal.unit,
    availableQuantity: quantity.quantity ?? candidates[0]?.quantity ?? null,
    availableUnit,
    quantityStatus: quantity.status,
    scoreContribution: 1,
  };
}

function findSubstitution(
  group: RequirementGroup,
  available: readonly AvailableIngredient[],
): IngredientMatchDetail | null {
  const substitutions = group.lines.flatMap((line) => line.substitutions ?? []);

  for (const substitution of substitutions) {
    const candidates = candidatesFor(substitution, available);
    if (candidates.length === 0) {
      continue;
    }

    const quantity = aggregateComparison([substitution], candidates);
    if (
      quantity.status === "insufficient" ||
      quantity.status === "incompatible"
    ) {
      continue;
    }

    return {
      key: group.key,
      name: displayName(group),
      status: "substituted",
      requiredQuantity: substitution.quantity ?? null,
      requiredUnit: normalizeUnit(substitution.unit),
      availableQuantity: quantity.quantity ?? candidates[0]?.quantity ?? null,
      availableUnit: quantity.unit ?? normalizeUnit(candidates[0]?.unit),
      quantityStatus: quantity.status,
      scoreContribution: 0.8,
      substitution: {
        name: ingredientDisplayName(substitution),
        note: substitution.note ?? null,
      },
    };
  }

  return null;
}

function resultReason(
  category: MatchCategory,
  requiredCount: number,
  details: readonly IngredientMatchDetail[],
): string {
  if (requiredCount === 0) {
    return "This recipe has no required ingredients.";
  }

  const missing = details.filter(
    (detail) => detail.status === "missing",
  ).length;
  const excluded = details.filter(
    (detail) => detail.status === "excluded",
  ).length;
  const quantityIssues = details.filter(
    (detail) =>
      detail.status === "insufficient_quantity" ||
      detail.status === "incompatible_units",
  ).length;
  const substitutions = details.filter(
    (detail) => detail.status === "substituted",
  ).length;

  if (category === "ready_to_cook") {
    return `All ${requiredCount} required ingredient${requiredCount === 1 ? " is" : "s are"} available.`;
  }

  if (category === "possible_with_substitutions") {
    return `${substitutions} explicitly saved substitution${substitutions === 1 ? " makes" : "s make"} this recipe possible.`;
  }

  const blockers = [
    missing > 0 ? `${missing} missing` : null,
    excluded > 0 ? `${excluded} excluded` : null,
    quantityIssues > 0
      ? `${quantityIssues} quantity issue${quantityIssues === 1 ? "" : "s"}`
      : null,
  ].filter((value): value is string => value != null);

  return category === "almost_ready"
    ? `Almost ready: ${blockers.join(", ")}.`
    : `Not enough ingredients yet: ${blockers.join(", ") || "no required ingredients are available"}.`;
}

function buildExplanations(
  requiredCount: number,
  details: readonly IngredientMatchDetail[],
): MatchExplanation[] {
  const explanations: MatchExplanation[] = [];
  const count = (status: IngredientMatchStatus) =>
    details.filter((detail) => detail.status === status).length;

  if (requiredCount === 0) {
    explanations.push({
      code: "no_required_ingredients",
      message:
        "Optional, garnish, and ignored staple rows do not create required work.",
    });
  } else if (
    details.filter((detail) =>
      [
        "missing",
        "excluded",
        "insufficient_quantity",
        "incompatible_units",
        "substituted",
      ].includes(detail.status),
    ).length === 0
  ) {
    explanations.push({
      code: "complete_match",
      message:
        "Every required ingredient identity is available with no known shortage.",
    });
  }

  const messages: Array<
    [IngredientMatchStatus, MatchExplanationCode, (amount: number) => string]
  > = [
    [
      "missing",
      "missing_ingredients",
      (amount) =>
        `${amount} required ingredient${amount === 1 ? " is" : "s are"} absent.`,
    ],
    [
      "excluded",
      "excluded_ingredients",
      (amount) =>
        `${amount} required ingredient${amount === 1 ? " was" : "s were"} explicitly excluded.`,
    ],
    [
      "insufficient_quantity",
      "insufficient_quantity",
      (amount) =>
        `${amount} ingredient${amount === 1 ? " has" : "s have"} a known quantity shortage.`,
    ],
    [
      "incompatible_units",
      "incompatible_units",
      (amount) =>
        `${amount} quantity comparison${amount === 1 ? " is" : "s are"} unsafe because the units are incompatible.`,
    ],
    [
      "substituted",
      "substitutions_used",
      (amount) =>
        `${amount} explicitly stored substitution${amount === 1 ? " is" : "s are"} available.`,
    ],
    [
      "ignored_optional",
      "optional_ignored",
      (amount) =>
        `${amount} optional or garnish ingredient${amount === 1 ? " does" : "s do"} not reduce the score.`,
    ],
    [
      "ignored_staple",
      "staples_ignored",
      (amount) =>
        `${amount} staple ingredient${amount === 1 ? " was" : "s were"} ignored by preference.`,
    ],
  ];

  for (const [status, code, message] of messages) {
    const amount = count(status);
    if (amount > 0) {
      explanations.push({ code, message: message(amount) });
    }
  }

  if (details.some((detail) => detail.quantityStatus === "unknown")) {
    explanations.push({
      code: "unknown_quantities",
      message:
        "At least one pantry quantity is unknown, so that ingredient was matched by identity only.",
    });
  }

  return explanations;
}

function matchesFilters(
  recipe: MatchableRecipe,
  filters: MatcherFilters | undefined,
): boolean {
  if (!filters) {
    return true;
  }

  const normalizedOptions = (values: readonly string[] | undefined) =>
    new Set((values ?? []).map((value) => value.trim().toLowerCase()));
  const categories = normalizedOptions(filters.categories);
  const difficulties = normalizedOptions(filters.difficulties);
  const dietaryTags = normalizedOptions(filters.dietaryTags);

  if (
    categories.size > 0 &&
    !categories.has(recipe.category?.trim().toLowerCase() ?? "")
  ) {
    return false;
  }

  if (
    difficulties.size > 0 &&
    !difficulties.has(recipe.difficulty?.trim().toLowerCase() ?? "")
  ) {
    return false;
  }

  if (
    filters.maxTotalMinutes != null &&
    (recipe.totalMinutes == null ||
      recipe.totalMinutes > filters.maxTotalMinutes)
  ) {
    return false;
  }

  if (dietaryTags.size > 0) {
    const recipeTags = new Set(
      (recipe.dietaryTags ?? []).map((tag) => tag.trim().toLowerCase()),
    );
    if (![...dietaryTags].every((tag) => recipeTags.has(tag))) {
      return false;
    }
  }

  return true;
}

export function matchRecipe(
  recipe: MatchableRecipe,
  availableIngredients: readonly AvailableIngredient[],
  options: MatcherOptions = {},
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
        name: displayName(group),
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

    const isIgnoredStaple = Boolean(
      options.ignoreStaples &&
      (group.representative.isStaple ||
        identityIntersectsTokens(group.representative, stapleTokens)),
    );

    if (isIgnoredStaple) {
      details.push({
        key: group.key,
        name: displayName(group),
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
        name: displayName(group),
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

    const candidates = candidatesFor(
      group.representative,
      availableIngredients,
    );
    if (candidates.length > 0) {
      details.push(detailForDirectMatch(group, candidates));
      continue;
    }

    const substitution = findSubstitution(group, availableIngredients);
    if (substitution) {
      details.push(substitution);
      continue;
    }

    details.push({
      key: group.key,
      name: displayName(group),
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
  if (unresolved.length === 0 && substitutions.length === 0) {
    category = "ready_to_cook";
  } else if (unresolved.length === 0 && substitutions.length > 0) {
    category = "possible_with_substitutions";
  } else if (
    unresolved.length <= maxUnavailable &&
    matchPercentage >= minimumPercentage
  ) {
    category = "almost_ready";
  } else {
    category = "not_enough_ingredients";
  }

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
  const collator = new Intl.Collator("en", {
    sensitivity: "base",
    numeric: true,
  });
  const results = recipes
    .filter((recipe) => matchesFilters(recipe, options.filters))
    .map((recipe, originalIndex) => ({
      originalIndex,
      result: matchRecipe(recipe, availableIngredients, options),
    }));

  results.sort((left, right) => {
    // Complete matches are the sole category-level exception. After that, the
    // documented tie-breakers apply globally, even across result categories.
    const leftComplete = left.result.category === "ready_to_cook" ? 1 : 0;
    const rightComplete = right.result.category === "ready_to_cook" ? 1 : 0;
    if (leftComplete !== rightComplete) {
      return rightComplete - leftComplete;
    }

    if (left.result.weightedScore !== right.result.weightedScore) {
      return right.result.weightedScore - left.result.weightedScore;
    }

    if (
      left.result.unavailableIngredientCount !==
      right.result.unavailableIngredientCount
    ) {
      return (
        left.result.unavailableIngredientCount -
        right.result.unavailableIngredientCount
      );
    }

    const leftTime =
      left.result.recipe.totalMinutes ?? Number.POSITIVE_INFINITY;
    const rightTime =
      right.result.recipe.totalMinutes ?? Number.POSITIVE_INFINITY;
    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    const titleOrder = collator.compare(
      left.result.recipe.title,
      right.result.recipe.title,
    );
    return titleOrder || left.originalIndex - right.originalIndex;
  });

  return results.map(({ result }, index) => ({
    ...result,
    rank: index + 1,
    rankingExplanation:
      result.category === "ready_to_cook"
        ? "Complete matches rank first; ties use score, unavailable count, and total time."
        : "Ranked by weighted score, then fewer unavailable ingredients, then shorter total time.",
  }));
}

export const matchRecipes = rankRecipes;
