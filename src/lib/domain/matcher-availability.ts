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
import type {
  AvailableIngredient,
  IngredientMatchDetail,
  MatcherIdentityOption,
  MatchRecipeIngredient,
  MatchSubstitution,
} from "./matcher-types";

export interface RequirementGroup {
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

export interface AvailableIngredientIndex {
  byToken: ReadonlyMap<string, readonly AvailableIngredient[]>;
}

export function optionTokens(
  options: readonly MatcherIdentityOption[] | undefined,
): Set<string> {
  const tokens = new Set<string>();
  for (const option of options ?? []) {
    if (typeof option === "string") {
      const trimmed = option.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("id:") || trimmed.startsWith("name:")) {
        tokens.add(trimmed.toLowerCase());
      } else {
        tokens.add(`id:${trimmed.toLowerCase()}`);
        tokens.add(`name:${normalizeIngredientName(trimmed)}`);
      }
    } else {
      for (const token of ingredientIdentityTokens(option)) tokens.add(token);
    }
  }
  return tokens;
}

export function identityIntersectsTokens(
  ingredient: IngredientIdentity,
  tokens: ReadonlySet<string>,
): boolean {
  return ingredientIdentityTokens(ingredient).some((token) =>
    tokens.has(token),
  );
}

export function groupRequirements(
  ingredients: readonly MatchRecipeIngredient[],
): RequirementGroup[] {
  const groups = new Map<string, RequirementGroup>();
  for (const ingredient of ingredients) {
    const key = ingredientIdentityKey(ingredient);
    const existing = groups.get(key);
    if (existing) existing.lines.push(ingredient);
    else
      groups.set(key, {
        key,
        representative: ingredient,
        lines: [ingredient],
      });
  }
  return [...groups.values()];
}

export function requiredLines(
  group: RequirementGroup,
): MatchRecipeIngredient[] {
  return group.lines.filter((line) => !line.isOptional && !line.isGarnish);
}

function availableIdentity(candidate: AvailableIngredient): IngredientIdentity {
  if (!candidate.ingredient) return candidate;
  return {
    ...candidate.ingredient,
    ingredientId:
      candidate.ingredientId ??
      candidate.ingredient.ingredientId ??
      candidate.ingredient.id,
  };
}

export function indexAvailableIngredients(
  available: readonly AvailableIngredient[],
): AvailableIngredientIndex {
  const byToken = new Map<string, AvailableIngredient[]>();
  for (const candidate of available) {
    if (
      candidate.isDepleted ||
      (candidate.quantity != null && candidate.quantity <= 0)
    )
      continue;
    for (const token of ingredientIdentityTokens(
      availableIdentity(candidate),
    )) {
      const matches = byToken.get(token);
      if (matches) matches.push(candidate);
      else byToken.set(token, [candidate]);
    }
  }
  return { byToken };
}

function candidatesFor(
  ingredient: MatchRecipeIngredient | MatchSubstitution,
  index: AvailableIngredientIndex,
): AvailableIngredient[] {
  const candidates = new Set<AvailableIngredient>();
  for (const token of ingredientIdentityTokens(ingredient)) {
    for (const candidate of index.byToken.get(token) ?? [])
      candidates.add(candidate);
  }
  return [...candidates].filter((candidate) =>
    ingredientsShareIdentity(ingredient, availableIdentity(candidate)),
  );
}

function aggregateComparison(
  requirements: readonly Pick<MatchRecipeIngredient, "quantity" | "unit">[],
  candidates: readonly AvailableIngredient[],
): AggregatedQuantity {
  const quantifiedRequirements = requirements.filter(
    (line): line is MatchRecipeIngredient & { quantity: number } =>
      line.quantity != null,
  );
  if (quantifiedRequirements.length === 0)
    return {
      quantity: null,
      unit: null,
      status: "not_applicable",
      comparison: null,
    };
  if (candidates.some((candidate) => candidate.quantity == null))
    return {
      quantity: null,
      unit: normalizeUnit(quantifiedRequirements[0].unit),
      status: "unknown",
      comparison: null,
    };

  const comparisonUnit = normalizeUnit(quantifiedRequirements[0].unit);
  let totalRequired = 0;
  for (const requirement of quantifiedRequirements) {
    const converted = convertQuantity(
      requirement.quantity,
      requirement.unit,
      comparisonUnit,
    );
    if (converted == null)
      return {
        quantity: null,
        unit: comparisonUnit,
        status: "incompatible",
        comparison: null,
      };
    totalRequired += converted;
  }

  let totalAvailable = 0;
  let hasIncompatibleCandidate = false;
  let firstAvailableUnit: string | null = null;
  for (const candidate of candidates) {
    if (candidate.quantity == null) continue;
    firstAvailableUnit ??= normalizeUnit(candidate.unit);
    const converted = convertQuantity(
      candidate.quantity,
      candidate.unit,
      comparisonUnit,
    );
    if (converted == null) hasIncompatibleCandidate = true;
    else totalAvailable += converted;
  }

  const comparison = compareQuantities(
    totalRequired,
    comparisonUnit,
    totalAvailable,
    comparisonUnit,
  );
  if (comparison.status === "insufficient" && hasIncompatibleCandidate)
    return {
      quantity: totalAvailable,
      unit: firstAvailableUnit,
      status: "incompatible",
      comparison: null,
    };
  return {
    quantity: totalAvailable,
    unit: comparisonUnit,
    status: comparison.status,
    comparison,
  };
}

export function summedRequiredQuantity(
  requirements: readonly MatchRecipeIngredient[],
): { quantity: number | null; unit: string | null } {
  const withQuantity = requirements.filter(
    (line): line is MatchRecipeIngredient & { quantity: number } =>
      line.quantity != null,
  );
  if (withQuantity.length === 0) return { quantity: null, unit: null };
  const unit = normalizeUnit(withQuantity[0].unit);
  let quantity = 0;
  for (const line of withQuantity) {
    const converted = convertQuantity(line.quantity, line.unit, unit);
    if (converted == null) return { quantity: null, unit };
    quantity += converted;
  }
  return { quantity, unit };
}

function displayName(group: RequirementGroup): string {
  return ingredientDisplayName(group.representative);
}

export function detailForDirectMatch(
  group: RequirementGroup,
  index: AvailableIngredientIndex,
): IngredientMatchDetail | null {
  const candidates = candidatesFor(group.representative, index);
  if (candidates.length === 0) return null;
  const required = requiredLines(group);
  const requiredTotal = summedRequiredQuantity(required);
  const quantity = aggregateComparison(required, candidates);
  const availableUnit = quantity.unit ?? normalizeUnit(candidates[0]?.unit);
  if (quantity.status === "insufficient")
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
  if (quantity.status === "incompatible")
    return {
      key: group.key,
      name: displayName(group),
      status: "incompatible_units",
      requiredQuantity: requiredTotal.quantity,
      requiredUnit: requiredTotal.unit,
      availableQuantity: candidates[0]?.quantity ?? null,
      availableUnit: normalizeUnit(candidates[0]?.unit),
      quantityStatus: quantity.status,
      scoreContribution: 1,
    };
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

export function findSubstitution(
  group: RequirementGroup,
  index: AvailableIngredientIndex,
): IngredientMatchDetail | null {
  for (const substitution of group.lines.flatMap(
    (line) => line.substitutions ?? [],
  )) {
    const candidates = candidatesFor(substitution, index);
    if (candidates.length === 0) continue;
    const quantity = aggregateComparison([substitution], candidates);
    if (
      quantity.status === "insufficient" ||
      quantity.status === "incompatible"
    )
      continue;
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
