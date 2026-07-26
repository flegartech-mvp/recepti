import type {
  Difficulty,
  Ingredient,
  IngredientCategory,
  MealCategory,
  PantryItem,
  Recipe,
  RecipeIngredient,
  RecipeStep,
  RecipeSummary,
  ShoppingListItem,
  StorageLocation,
} from "@/types/domain";

export type UnknownRecord = Record<string, unknown>;
export type RecipeSummaryWithImagePath = RecipeSummary & {
  imagePath: string | null;
};

export const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
export const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
export const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
export const asNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
export const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
export const asNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === ""
    ? null
    : asNumber(value);
export const asBoolean = (value: unknown): boolean => value === true;

const mealCategories = new Set<MealCategory>([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "side",
  "drink",
  "other",
]);
const difficulties = new Set<Difficulty>(["easy", "medium", "challenging"]);

function asMealCategory(value: unknown): MealCategory {
  const candidate = asString(value) as MealCategory;
  return mealCategories.has(candidate) ? candidate : "other";
}

function asDifficulty(value: unknown): Difficulty {
  const candidate = asString(value) as Difficulty;
  return difficulties.has(candidate) ? candidate : "easy";
}

export function mapTags(value: unknown) {
  const dietaryTags: string[] = [];
  const customTags: string[] = [];
  for (const link of asArray(value)) {
    const tag = asRecord(asRecord(link).tags);
    const name = asString(tag.name);
    if (!name) continue;
    if (asString(tag.type) === "dietary") dietaryTags.push(name);
    else customTags.push(name);
  }
  return { dietaryTags, customTags };
}

export function uniqueSortedLabels(values: Array<string | null | undefined>) {
  const labels = new Map<string, string>();
  for (const value of values) {
    const label = value?.trim();
    if (!label) continue;
    const key = label.toLocaleLowerCase("en-US");
    if (!labels.has(key)) labels.set(key, label);
  }
  return [...labels.values()].sort((left, right) =>
    left.localeCompare(right, "en-US", { sensitivity: "base" }),
  );
}

export function mapRecipeSummary(value: unknown): RecipeSummaryWithImagePath {
  const row = asRecord(value);
  const tags = mapTags(row.recipe_tags);
  return {
    id: asString(row.id),
    title: asString(row.title, "Untitled recipe"),
    description: asNullableString(row.description),
    imagePath: asNullableString(row.image_path),
    imageUrl: asNullableString(row.image_url),
    category: asMealCategory(row.category),
    cuisine: asNullableString(row.cuisine),
    difficulty: asDifficulty(row.difficulty),
    totalMinutes: asNumber(
      row.total_minutes,
      asNumber(row.prep_minutes) +
        asNumber(row.cook_minutes) +
        asNumber(row.rest_minutes),
    ),
    isFavorite: asBoolean(row.is_favorite),
    status: asString(row.status) === "draft" ? "draft" : "published",
    cookedCount: asNumber(row.cooked_count),
    lastCookedAt: asNullableString(row.last_cooked_at),
    createdAt: asString(row.created_at, new Date(0).toISOString()),
    updatedAt: asString(row.updated_at, new Date(0).toISOString()),
    dietaryTags: asArray(row.dietary_tags).map(String).filter(Boolean).length
      ? asArray(row.dietary_tags).map(String).filter(Boolean)
      : tags.dietaryTags,
    customTags: asArray(row.custom_tags).map(String).filter(Boolean).length
      ? asArray(row.custom_tags).map(String).filter(Boolean)
      : tags.customTags,
    matchPercentage:
      row.match_percentage === undefined
        ? undefined
        : asNumber(row.match_percentage),
    missingIngredientNames:
      row.missing_ingredients === undefined
        ? undefined
        : asArray(row.missing_ingredients).map(String).filter(Boolean),
  };
}

export function mapRecipeIngredient(value: unknown): RecipeIngredient {
  const row = asRecord(value);
  const ingredient = asRecord(row.ingredients);
  return {
    id: asString(row.id),
    ingredientId: asString(row.ingredient_id),
    canonicalName: asString(ingredient.canonical_name, "Ingredient"),
    displayName: asString(
      row.display_name,
      asString(
        ingredient.display_name,
        asString(ingredient.canonical_name, "Ingredient"),
      ),
    ),
    normalizedName: asString(ingredient.normalized_name),
    quantity: asNullableNumber(row.quantity),
    unit: asNullableString(row.unit),
    preparationNote: asNullableString(row.preparation_note),
    isOptional: asBoolean(row.is_optional),
    isGarnish: asBoolean(row.is_garnish),
    sectionName: asNullableString(row.section_name),
    sortOrder: asNumber(row.sort_order),
    isStaple: asBoolean(ingredient.is_staple),
    substitutions: asArray(row.substitutions).map((value) => {
      const substitution = asRecord(value);
      const target = asRecord(substitution.substitute);
      return {
        ingredientId: asString(target.id),
        canonicalName: asString(target.canonical_name),
        displayName: asString(
          target.display_name,
          asString(target.canonical_name),
        ),
        normalizedName: asString(target.normalized_name),
        quantity: null,
        unit: asNullableString(substitution.substitute_unit),
        note: asNullableString(substitution.notes),
      };
    }),
  };
}

function mapRecipeStep(value: unknown): RecipeStep {
  const row = asRecord(value);
  return {
    id: asString(row.id),
    instruction: asString(row.instruction),
    timerSeconds: asNullableNumber(row.timer_seconds),
    imagePath: asNullableString(row.image_path),
    sortOrder: asNumber(row.sort_order),
  };
}

export function mapRecipe(value: unknown): Recipe {
  const row = asRecord(value);
  const summary = mapRecipeSummary(row);
  const prepMinutes = asNumber(row.prep_minutes);
  const cookMinutes = asNumber(row.cook_minutes);
  const restMinutes = asNumber(row.rest_minutes);
  return {
    ...summary,
    revision: asNumber(row.revision, 1),
    slug: asString(row.slug),
    imagePath: asNullableString(row.image_path),
    prepMinutes,
    cookMinutes,
    restMinutes,
    totalMinutes: asNumber(
      row.total_minutes,
      prepMinutes + cookMinutes + restMinutes,
    ),
    servings: asNumber(row.servings, 1),
    sourceName: asNullableString(row.source_name),
    sourceUrl: asNullableString(row.source_url),
    notes: asNullableString(row.notes),
    ingredients: asArray(row.recipe_ingredients)
      .map(mapRecipeIngredient)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    steps: asArray(row.recipe_steps)
      .map(mapRecipeStep)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export function mapIngredient(value: unknown): Ingredient {
  const row = asRecord(value);
  return {
    id: asString(row.id),
    canonicalName: asString(row.canonical_name),
    displayName: asString(row.display_name, asString(row.canonical_name)),
    normalizedName: asString(row.normalized_name),
    category: asString(row.category, "other") as IngredientCategory,
    defaultUnit: asNullableString(row.default_unit),
    aliases: asArray(row.aliases).map(String).filter(Boolean),
    isStaple: asBoolean(row.is_staple),
    notes: asNullableString(row.notes),
    recipeCount:
      row.recipe_count === undefined ? undefined : asNumber(row.recipe_count),
  };
}

export function mapPantryItem(value: unknown): PantryItem {
  const row = asRecord(value);
  return {
    id: asString(row.id),
    ingredientId: asString(row.ingredient_id),
    ingredient: mapIngredient(row.ingredients),
    quantity: asNullableNumber(row.quantity),
    unit: asNullableString(row.unit),
    storageLocation: asString(row.storage_location, "other") as StorageLocation,
    expirationDate: asNullableString(row.expiration_date),
    lowStock: asBoolean(row.low_stock),
    isDepleted: asBoolean(row.is_depleted),
    notes: asNullableString(row.notes),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapShoppingItem(value: unknown): ShoppingListItem {
  const row = asRecord(value);
  const ingredient = asRecord(row.ingredients);
  const recipe = asRecord(row.recipes);
  return {
    id: asString(row.id),
    ingredientId: asNullableString(row.ingredient_id),
    ingredientName: asString(
      row.custom_name,
      asString(
        ingredient.display_name,
        asString(ingredient.canonical_name, "Item"),
      ),
    ),
    quantity: asNullableNumber(row.quantity),
    unit: asNullableString(row.unit),
    recipeId: asNullableString(row.recipe_id),
    recipeTitle: asNullableString(recipe.title),
    isCompleted: asBoolean(row.is_completed),
    completedAt: asNullableString(row.completed_at),
    createdAt: asString(row.created_at),
  };
}
