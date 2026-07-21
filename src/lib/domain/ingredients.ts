const INVISIBLE_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;
const HORIZONTAL_WHITESPACE = /[\s\u00A0]+/g;
const APOSTROPHES = /[\u2018\u2019\u02BC`\u00B4]/g;
const DASHES = /[\u2010-\u2015\u2212]/g;

/**
 * Produces the stable, human-readable key used for ingredient lookup.
 *
 * We intentionally do not remove accents, punctuation, or plural endings. Those
 * transformations can merge genuinely different foods in multilingual catalogs.
 * Aliases are the explicit mechanism for equivalence beyond typography and case.
 */
export function normalizeIngredientName(value: string): string {
  return value
    .normalize("NFC")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(APOSTROPHES, "'")
    .replace(DASHES, "-")
    .replace(HORIZONTAL_WHITESPACE, " ")
    .trim()
    .toLowerCase();
}

export const normalizeIngredient = normalizeIngredientName;

export interface IngredientIdentity {
  /** Catalog ID when the source object itself is an ingredient record. */
  id?: string | null;
  ingredientId?: string | null;
  name?: string | null;
  canonicalName?: string | null;
  displayName?: string | null;
  normalizedName?: string | null;
  aliases?: readonly string[];
}

export function ingredientCanonicalName(
  ingredient: IngredientIdentity,
): string {
  return (
    ingredient.canonicalName?.trim() ||
    ingredient.name?.trim() ||
    ingredient.normalizedName?.trim() ||
    ""
  );
}

export function ingredientDisplayName(ingredient: IngredientIdentity): string {
  return ingredient.displayName?.trim() || ingredientCanonicalName(ingredient);
}

export function ingredientIdentityKey(ingredient: IngredientIdentity): string {
  const id = ingredient.ingredientId?.trim() || ingredient.id?.trim();

  if (id) {
    return `id:${id.toLowerCase()}`;
  }

  return `name:${normalizeIngredientName(
    ingredient.normalizedName?.trim() || ingredientCanonicalName(ingredient),
  )}`;
}

/** Returns all explicit ways an ingredient may be matched, strongest first. */
export function ingredientIdentityTokens(
  ingredient: IngredientIdentity,
): readonly string[] {
  const tokens = new Set<string>();
  const id = ingredient.ingredientId?.trim() || ingredient.id?.trim();

  if (id) {
    tokens.add(`id:${id.toLowerCase()}`);
  }

  const names = [
    ingredient.normalizedName?.trim() || ingredientCanonicalName(ingredient),
    ...(ingredient.aliases ?? []),
  ];

  for (const name of names) {
    const normalized = normalizeIngredientName(name);
    if (normalized) {
      tokens.add(`name:${normalized}`);
    }
  }

  return [...tokens];
}

/**
 * IDs are authoritative when both sides have one. A same-looking name must not
 * silently merge two catalog records that were deliberately kept distinct.
 */
export function ingredientsShareIdentity(
  left: IngredientIdentity,
  right: IngredientIdentity,
): boolean {
  const leftId = (left.ingredientId || left.id)?.trim().toLowerCase();
  const rightId = (right.ingredientId || right.id)?.trim().toLowerCase();

  if (leftId && rightId) {
    return leftId === rightId;
  }

  const leftTokens = new Set(ingredientIdentityTokens(left));
  return ingredientIdentityTokens(right).some((token) => leftTokens.has(token));
}

export function uniqueNormalizedIngredientNames(
  names: readonly string[],
): string[] {
  return [...new Set(names.map(normalizeIngredientName).filter(Boolean))];
}
