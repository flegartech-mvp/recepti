import {
  findIngredientDefinition,
  type SupportedLocale,
} from "@/data/pantry-starters";
import type { RetailerProduct } from "@/lib/retailers/types";
import type { Ingredient } from "@/types/domain";

const NON_WORD = /[^a-z0-9]+/g;

export function normalizeIngredientSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(NON_WORD, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export interface IngredientSearchResult {
  key: string;
  ingredient: Ingredient;
  canonicalName: string;
  displayName: string;
  secondaryText: string | null;
  ingredientSlug: string | null;
  matchingProductNames: string[];
  score: number;
}

function subsequenceScore(query: string, candidate: string): number {
  let queryIndex = 0;
  let gap = 0;
  for (
    let index = 0;
    index < candidate.length && queryIndex < query.length;
    index += 1
  ) {
    if (candidate[index] === query[queryIndex]) queryIndex += 1;
    else if (queryIndex > 0) gap += 1;
  }
  return queryIndex === query.length ? Math.max(1, 180 - gap) : 0;
}

function textScore(query: string, candidate: string): number {
  if (!query) return 1;
  if (!candidate) return 0;
  if (candidate === query) return 1_000;
  if (candidate.startsWith(query)) return 850;
  if (candidate.split(" ").some((word) => word.startsWith(query))) return 720;
  if (candidate.includes(query)) return 560;
  const queryWords = query.split(" ");
  if (
    queryWords.length > 1 &&
    queryWords.every((word) => candidate.includes(word))
  ) {
    return 480;
  }
  return query.length >= 3 ? subsequenceScore(query, candidate) : 0;
}

function productText(product: RetailerProduct): string[] {
  return [
    product.name,
    product.brand ?? "",
    product.retailerName,
    product.category ?? "",
    ...(product.aliases ?? []),
  ];
}

function identityKey(ingredient: Ingredient): string {
  const definition = findIngredientDefinition(ingredient);
  if (definition) return `slug:${definition.slug}`;
  return ingredient.id.startsWith("catalog:")
    ? ingredient.id
    : `id:${ingredient.id.toLocaleLowerCase("en-US")}`;
}

export function localizedIngredientName(
  ingredient: Ingredient,
  locale: SupportedLocale,
): string {
  return (
    findIngredientDefinition(ingredient)?.names[locale] ??
    ingredient.displayName
  );
}

export function searchIngredients(
  ingredients: readonly Ingredient[],
  queryValue: string,
  options: {
    locale?: SupportedLocale;
    products?: readonly RetailerProduct[];
    limit?: number;
  } = {},
): IngredientSearchResult[] {
  const locale = options.locale ?? "en";
  const products = options.products ?? [];
  const query = normalizeIngredientSearch(queryValue);
  const deduplicated = new Map<string, IngredientSearchResult>();

  for (const ingredient of ingredients) {
    const definition = findIngredientDefinition(ingredient);
    const ingredientSlug = definition?.slug ?? null;
    const localizedName = definition?.names[locale] ?? ingredient.displayName;
    const names = [
      ingredient.canonicalName,
      ingredient.displayName,
      ingredient.normalizedName,
      ...ingredient.aliases,
      definition?.names.en ?? "",
      definition?.names.sl ?? "",
      ...(definition?.aliases ?? []),
    ].filter(Boolean);
    const matchingProducts = products.filter((product) =>
      ingredientSlug
        ? product.ingredientSlugs.includes(ingredientSlug)
        : product.ingredientIds.includes(ingredient.id),
    );
    const nameScore = Math.max(
      0,
      ...names.map((name) => textScore(query, normalizeIngredientSearch(name))),
    );
    const retailerScore = Math.max(
      0,
      ...matchingProducts.flatMap((product) =>
        productText(product).map((text) =>
          Math.max(0, textScore(query, normalizeIngredientSearch(text)) - 90),
        ),
      ),
    );
    const score = query ? Math.max(nameScore, retailerScore) : 1;
    if (score <= 0) continue;

    const otherNames = [
      definition?.names[locale === "sl" ? "en" : "sl"],
      ...ingredient.aliases,
    ]
      .filter((name): name is string => Boolean(name))
      .filter(
        (name) =>
          normalizeIngredientSearch(name) !==
          normalizeIngredientSearch(localizedName),
      );
    const result: IngredientSearchResult = {
      key: identityKey(ingredient),
      ingredient,
      canonicalName: ingredient.canonicalName,
      displayName: localizedName,
      secondaryText: otherNames.slice(0, 2).join(" · ") || null,
      ingredientSlug,
      matchingProductNames: matchingProducts
        .filter((product) =>
          query
            ? productText(product).some(
                (text) => textScore(query, normalizeIngredientSearch(text)) > 0,
              )
            : false,
        )
        .slice(0, 2)
        .map((product) => `${product.retailerName}: ${product.name}`),
      score,
    };
    const previous = deduplicated.get(result.key);
    if (!previous || result.score > previous.score) {
      deduplicated.set(result.key, result);
    }
  }

  return [...deduplicated.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.displayName.localeCompare(right.displayName, locale),
    )
    .slice(0, options.limit ?? 12);
}
