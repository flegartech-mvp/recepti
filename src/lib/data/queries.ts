import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import {
  demoIngredients,
  demoPantry,
  demoRecipes,
  demoShopping,
} from "@/lib/data/demo";
import { attachMakeabilityToRecipeSummaries } from "@/lib/data/recipe-makeability";
import { rankRecipes } from "@/lib/domain";
import { pantryStarters } from "@/data/pantry-starters";
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardData,
  Difficulty,
  Ingredient,
  IngredientCategory,
  MealCategory,
  PaginatedRecipes,
  PantryItem,
  Recipe,
  RecipeIngredient,
  RecipeListFilters,
  RecipeStep,
  RecipeSummary,
  ShoppingListItem,
  StorageLocation,
} from "@/types/domain";
import type { SettingsValues } from "@/lib/validation";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : {};
const asArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const asNullableString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;
const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const asNullableNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === ""
    ? null
    : asNumber(value);
const asBoolean = (value: unknown): boolean => value === true;

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

function mapTags(value: unknown) {
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

function uniqueSortedLabels(values: Array<string | null | undefined>) {
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

type RecipeSummaryWithImagePath = RecipeSummary & { imagePath: string | null };

function mapRecipeSummary(value: unknown): RecipeSummaryWithImagePath {
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

function mapRecipeIngredient(value: unknown): RecipeIngredient {
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

function mapRecipe(value: unknown): Recipe {
  const row = asRecord(value);
  const summary = mapRecipeSummary(row);
  const prepMinutes = asNumber(row.prep_minutes);
  const cookMinutes = asNumber(row.cook_minutes);
  const restMinutes = asNumber(row.rest_minutes);
  return {
    ...summary,
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

function mapIngredient(value: unknown): Ingredient {
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

async function attachSignedImageUrls<
  T extends { imagePath?: string | null; imageUrl?: string | null },
>(items: T[]): Promise<T[]> {
  const paths = items
    .map((item) => item.imagePath)
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) return items;
  const client = await createClient();
  const { data } = await client.storage
    .from("recipe-images")
    .createSignedUrls(paths, 60 * 60);
  const urlByPath = new Map(
    (data ?? []).map((entry) => [entry.path, entry.signedUrl]),
  );
  return items.map((item) =>
    item.imagePath
      ? { ...item, imageUrl: urlByPath.get(item.imagePath) ?? null }
      : item,
  );
}

async function attachRecipeSummaryTags(
  items: RecipeSummaryWithImagePath[],
): Promise<RecipeSummaryWithImagePath[]> {
  const ids = items.map((item) => item.id).filter(Boolean);
  if (ids.length === 0) return items;
  const client = await createClient();
  const { data } = await client
    .from("recipe_tags")
    .select("recipe_id,tags(name,type)")
    .in("recipe_id", ids);
  const tagsByRecipe = new Map<
    string,
    { dietaryTags: string[]; customTags: string[] }
  >();
  for (const link of data ?? []) {
    const row = asRecord(link);
    const recipeId = asString(row.recipe_id);
    const tags = mapTags([row]);
    const current = tagsByRecipe.get(recipeId) ?? {
      dietaryTags: [],
      customTags: [],
    };
    current.dietaryTags.push(...tags.dietaryTags);
    current.customTags.push(...tags.customTags);
    tagsByRecipe.set(recipeId, current);
  }
  return items.map((item) => ({
    ...item,
    ...(tagsByRecipe.get(item.id) ?? {}),
  }));
}

async function attachRecipeSubstitutions(recipes: Recipe[]): Promise<Recipe[]> {
  const ingredientIds = [
    ...new Set(
      recipes.flatMap((recipe) =>
        recipe.ingredients.map((item) => item.ingredientId),
      ),
    ),
  ].filter(Boolean);
  if (ingredientIds.length === 0) return recipes;

  const client = await createClient();
  const { data, error } = await client
    .from("ingredient_substitutions")
    .select("*,substitute:ingredients!ingredient_substitutions_target_fk(*)")
    .in("ingredient_id", ingredientIds);
  if (error)
    throw new Error("Saved ingredient substitutions could not be loaded.");

  const byIngredient = new Map<string, RecipeIngredient["substitutions"]>();
  for (const value of data ?? []) {
    const row = asRecord(value);
    const sourceId = asString(row.ingredient_id);
    const target = asRecord(row.substitute);
    const substitutions = byIngredient.get(sourceId) ?? [];
    substitutions.push({
      ingredientId: asString(target.id),
      canonicalName: asString(target.canonical_name),
      displayName: asString(
        target.display_name,
        asString(target.canonical_name),
      ),
      normalizedName: asString(target.normalized_name),
      quantity: null,
      unit: asNullableString(row.substitute_unit),
      note: asNullableString(row.notes),
    });
    byIngredient.set(sourceId, substitutions);
  }

  return recipes.map((recipe) => ({
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      substitutions: byIngredient.get(ingredient.ingredientId) ?? [],
    })),
  }));
}

function mapPantryItem(value: unknown): PantryItem {
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

const MAKEABILITY_PAGE_SIZE = 1_000;
const MAKEABILITY_ID_CHUNK_SIZE = 100;

function chunkIds(ids: readonly string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += MAKEABILITY_ID_CHUNK_SIZE) {
    chunks.push(ids.slice(index, index + MAKEABILITY_ID_CHUNK_SIZE));
  }
  return chunks;
}

async function attachRecipeSummaryMakeability(
  items: RecipeSummaryWithImagePath[],
): Promise<RecipeSummaryWithImagePath[]> {
  const recipeIds = items.map((item) => item.id).filter(Boolean);
  if (recipeIds.length === 0) return items;

  const client = await createClient();
  const loadRecipeIngredientRows = async () => {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += MAKEABILITY_PAGE_SIZE) {
      const { data, error } = await client
        .from("recipe_ingredients")
        .select(
          "recipe_id,ingredient_id,quantity,unit,display_name,preparation_note,is_optional,is_garnish,section_name,sort_order,ingredients(id,canonical_name,display_name,normalized_name,is_staple)",
        )
        .in("recipe_id", recipeIds)
        .order("id")
        .range(offset, offset + MAKEABILITY_PAGE_SIZE - 1);
      if (error)
        throw new Error("Recipe makeability requirements could not be loaded.");
      rows.push(...(data ?? []));
      if ((data?.length ?? 0) < MAKEABILITY_PAGE_SIZE) break;
    }
    return rows;
  };

  const [pantryCountResult, ingredientRows] = await Promise.all([
    client
      .from("pantry_items")
      .select("id", { count: "exact", head: true })
      .eq("is_depleted", false),
    loadRecipeIngredientRows(),
  ]);
  if (pantryCountResult.error)
    throw new Error("Pantry availability could not be checked.");

  const pantryHasItems = (pantryCountResult.count ?? 0) > 0;
  if (!pantryHasItems) return items;

  const sourceIngredientIds = [
    ...new Set(
      ingredientRows
        .map((value) => asString(asRecord(value).ingredient_id))
        .filter(Boolean),
    ),
  ];
  const substitutionsByIngredient = new Map<
    string,
    NonNullable<RecipeIngredient["substitutions"]>
  >();
  const relevantIngredientIds = new Set(sourceIngredientIds);

  for (const ids of chunkIds(sourceIngredientIds)) {
    for (let offset = 0; ; offset += MAKEABILITY_PAGE_SIZE) {
      const { data, error } = await client
        .from("ingredient_substitutions")
        .select(
          "ingredient_id,substitute_ingredient_id,substitute_unit,notes,substitute:ingredients!ingredient_substitutions_target_fk(id,canonical_name,display_name,normalized_name)",
        )
        .in("ingredient_id", ids)
        .order("id")
        .range(offset, offset + MAKEABILITY_PAGE_SIZE - 1);
      if (error) throw new Error("Recipe substitutions could not be loaded.");

      for (const value of data ?? []) {
        const row = asRecord(value);
        const sourceId = asString(row.ingredient_id);
        const target = asRecord(row.substitute);
        const targetId = asString(
          target.id,
          asString(row.substitute_ingredient_id),
        );
        if (!sourceId || !targetId) continue;
        relevantIngredientIds.add(targetId);
        const substitutions = substitutionsByIngredient.get(sourceId) ?? [];
        substitutions.push({
          ingredientId: targetId,
          canonicalName: asString(target.canonical_name),
          displayName: asString(
            target.display_name,
            asString(target.canonical_name),
          ),
          normalizedName: asString(target.normalized_name),
          quantity: null,
          unit: asNullableString(row.substitute_unit),
          note: asNullableString(row.notes),
        });
        substitutionsByIngredient.set(sourceId, substitutions);
      }

      if ((data?.length ?? 0) < MAKEABILITY_PAGE_SIZE) break;
    }
  }

  const pantry: PantryItem[] = [];
  for (const ids of chunkIds([...relevantIngredientIds])) {
    for (let offset = 0; ; offset += MAKEABILITY_PAGE_SIZE) {
      const { data, error } = await client
        .from("pantry_items")
        .select("*,ingredients(*)")
        .eq("is_depleted", false)
        .in("ingredient_id", ids)
        .order("id")
        .range(offset, offset + MAKEABILITY_PAGE_SIZE - 1);
      if (error) throw new Error("Pantry availability could not be loaded.");
      pantry.push(...(data ?? []).map(mapPantryItem));
      if ((data?.length ?? 0) < MAKEABILITY_PAGE_SIZE) break;
    }
  }

  const ingredientsByRecipe = new Map<string, RecipeIngredient[]>();
  for (const value of ingredientRows) {
    const row = asRecord(value);
    const recipeId = asString(row.recipe_id);
    const ingredient = mapRecipeIngredient(row);
    ingredient.substitutions =
      substitutionsByIngredient.get(ingredient.ingredientId) ?? [];
    const ingredients = ingredientsByRecipe.get(recipeId) ?? [];
    ingredients.push(ingredient);
    ingredientsByRecipe.set(recipeId, ingredients);
  }

  const matchableRecipes = items.map((item) => ({
    id: item.id,
    title: item.title,
    totalMinutes: item.totalMinutes,
    category: item.category,
    difficulty: item.difficulty,
    dietaryTags: item.dietaryTags,
    ingredients: ingredientsByRecipe.get(item.id) ?? [],
  }));

  return attachMakeabilityToRecipeSummaries(
    items,
    matchableRecipes,
    pantry,
    pantryHasItems,
  ) as RecipeSummaryWithImagePath[];
}

export async function getDashboardData(): Promise<DashboardData> {
  await requireOwner("/dashboard");
  if (isTestAuthenticationEnabled()) {
    return {
      recipeCount: demoRecipes.length,
      favoriteCount: demoRecipes.filter((recipe) => recipe.isFavorite).length,
      pantryCount: demoPantry.length,
      makeableCount: 2,
      recentRecipes: [...demoRecipes]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 4),
      recentlyCooked: [...demoRecipes]
        .filter((recipe) => recipe.lastCookedAt)
        .sort((a, b) =>
          (b.lastCookedAt ?? "").localeCompare(a.lastCookedAt ?? ""),
        )
        .slice(0, 4),
    };
  }

  const client = await createClient();
  const [
    metricsResult,
    recentResult,
    cookedResult,
    pantryResult,
    matchingResult,
  ] = await Promise.all([
    client.from("recipes").select("id,is_favorite", { count: "exact" }),
    client
      .from("recipes")
      .select(
        "id,title,description,image_path,category,cuisine,difficulty,prep_minutes,cook_minutes,rest_minutes,is_favorite,status,cooked_count,last_cooked_at,created_at,updated_at,recipe_tags(tags(name,type))",
      )
      .order("created_at", { ascending: false })
      .limit(4),
    client
      .from("recipes")
      .select(
        "id,title,description,image_path,category,cuisine,difficulty,prep_minutes,cook_minutes,rest_minutes,is_favorite,status,cooked_count,last_cooked_at,created_at,updated_at,recipe_tags(tags(name,type))",
      )
      .not("last_cooked_at", "is", null)
      .order("last_cooked_at", { ascending: false })
      .limit(4),
    client
      .from("pantry_items")
      .select("*,ingredients(*)")
      .eq("is_depleted", false),
    client
      .from("recipes")
      .select("*,recipe_ingredients(*,ingredients(*))")
      .eq("status", "published"),
  ]);
  if (
    metricsResult.error ||
    recentResult.error ||
    cookedResult.error ||
    pantryResult.error ||
    matchingResult.error
  ) {
    throw new Error("Cookbook dashboard data could not be loaded.");
  }

  const recent = (recentResult.data ?? []).map(mapRecipeSummary);
  const cooked = (cookedResult.data ?? []).map(mapRecipeSummary);
  const hydratedSummaries = await attachSignedImageUrls([...recent, ...cooked]);
  const recentRecipes = hydratedSummaries.slice(0, recent.length);
  const recentlyCooked = hydratedSummaries.slice(recent.length);
  const pantry = (pantryResult.data ?? []).map(mapPantryItem);
  const recipesForMatching = await attachRecipeSubstitutions(
    (matchingResult.data ?? []).map(mapRecipe),
  );
  const makeableCount = rankRecipes(recipesForMatching, pantry, {
    ignoreStaples: true,
  }).filter((result) => result.category === "ready_to_cook").length;

  return {
    recipeCount: metricsResult.count ?? metricsResult.data?.length ?? 0,
    favoriteCount: (metricsResult.data ?? []).filter(
      (recipe) => recipe.is_favorite,
    ).length,
    pantryCount: pantry.length,
    makeableCount,
    recentRecipes,
    recentlyCooked,
  };
}

export interface RecipeFilterOptions {
  cuisines: string[];
  dietaryTags: string[];
}

export async function getRecipeFilterOptions(): Promise<RecipeFilterOptions> {
  await requireOwner("/recipes");

  if (isTestAuthenticationEnabled()) {
    return {
      cuisines: uniqueSortedLabels(demoRecipes.map((recipe) => recipe.cuisine)),
      dietaryTags: uniqueSortedLabels(
        demoRecipes.flatMap((recipe) => recipe.dietaryTags),
      ),
    };
  }

  const client = await createClient();
  const [cuisineResult, tagResult] = await Promise.all([
    client.from("recipes").select("cuisine").not("cuisine", "is", null),
    client.from("recipe_tags").select("tags(name,type)"),
  ]);

  if (cuisineResult.error || tagResult.error) {
    throw new Error("Recipe filters could not be loaded.");
  }

  return {
    cuisines: uniqueSortedLabels(
      (cuisineResult.data ?? []).map((row) => row.cuisine),
    ),
    dietaryTags: uniqueSortedLabels(
      (tagResult.data ?? []).flatMap((row) => mapTags([row]).dietaryTags),
    ),
  };
}

export async function listRecipes(
  filters: RecipeListFilters = {},
): Promise<PaginatedRecipes> {
  await requireOwner("/recipes");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));

  if (isTestAuthenticationEnabled()) {
    let recipes = [...demoRecipes];
    const query = filters.query?.trim().toLocaleLowerCase("en-US");
    if (query) {
      recipes = recipes.filter((recipe) =>
        [
          recipe.title,
          recipe.description,
          recipe.cuisine,
          ...recipe.dietaryTags,
          ...recipe.customTags,
          ...recipe.ingredients.map((item) => item.displayName),
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLocaleLowerCase("en-US").includes(query),
          ),
      );
    }
    if (filters.favorite)
      recipes = recipes.filter((recipe) => recipe.isFavorite);
    if (filters.category)
      recipes = recipes.filter(
        (recipe) => recipe.category === filters.category,
      );
    if (filters.cuisine) {
      const cuisine = filters.cuisine.toLocaleLowerCase("en-US");
      recipes = recipes.filter(
        (recipe) => recipe.cuisine?.toLocaleLowerCase("en-US") === cuisine,
      );
    }
    if (filters.difficulty)
      recipes = recipes.filter(
        (recipe) => recipe.difficulty === filters.difficulty,
      );
    if (filters.dietaryTag) {
      const dietaryTag = filters.dietaryTag.toLocaleLowerCase("en-US");
      recipes = recipes.filter((recipe) =>
        recipe.dietaryTags.some(
          (tag) => tag.toLocaleLowerCase("en-US") === dietaryTag,
        ),
      );
    }
    if (filters.maxPrepMinutes !== undefined)
      recipes = recipes.filter(
        (recipe) => recipe.prepMinutes <= filters.maxPrepMinutes!,
      );
    if (filters.maxTotalMinutes !== undefined)
      recipes = recipes.filter(
        (recipe) => recipe.totalMinutes <= filters.maxTotalMinutes!,
      );
    const sort = filters.sort ?? "newest";
    recipes.sort((a, b) => {
      if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
      if (sort === "alphabetical") return a.title.localeCompare(b.title);
      if (sort === "recently_cooked")
        return (b.lastCookedAt ?? "").localeCompare(a.lastCookedAt ?? "");
      if (sort === "most_cooked") return b.cookedCount - a.cookedCount;
      if (sort === "shortest") return a.totalMinutes - b.totalMinutes;
      return b.createdAt.localeCompare(a.createdAt);
    });
    const start = (page - 1) * pageSize;
    const pageRecipes = recipes.slice(start, start + pageSize);
    return {
      recipes: attachMakeabilityToRecipeSummaries(
        pageRecipes,
        pageRecipes,
        demoPantry,
      ),
      total: recipes.length,
      page,
      pageSize,
    };
  }

  const client = await createClient();
  const { data, error } = await client.rpc("search_recipes", {
    p_query: filters.query?.trim() || null,
    p_favorite: filters.favorite ?? null,
    p_category: filters.category || null,
    p_cuisine: filters.cuisine || null,
    p_difficulty: filters.difficulty || null,
    p_dietary_tag: filters.dietaryTag || null,
    p_max_prep_minutes: filters.maxPrepMinutes ?? null,
    p_max_total_minutes: filters.maxTotalMinutes ?? null,
    p_sort: filters.sort ?? "newest",
    p_limit: pageSize,
    p_offset: (page - 1) * pageSize,
  });
  if (error) throw new Error("Recipes could not be searched.");
  const rows = asArray(data);
  const total =
    rows.length > 0 ? asNumber(asRecord(rows[0]).total_count, rows.length) : 0;
  const summaries = rows.map(mapRecipeSummary);
  const [withImages, withTags, withMakeability] = await Promise.all([
    attachSignedImageUrls(summaries),
    attachRecipeSummaryTags(summaries),
    attachRecipeSummaryMakeability(summaries),
  ]);
  const tagsById = new Map(
    withTags.map((item) => [
      item.id,
      { dietaryTags: item.dietaryTags, customTags: item.customTags },
    ]),
  );
  const makeabilityById = new Map(
    withMakeability.map((item) => [
      item.id,
      {
        matchPercentage: item.matchPercentage,
        missingIngredientNames: item.missingIngredientNames,
      },
    ]),
  );
  return {
    recipes: withImages.map((item) => ({
      ...item,
      ...(tagsById.get(item.id) ?? {}),
      ...(makeabilityById.get(item.id) ?? {}),
    })),
    total,
    page,
    pageSize,
  };
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  await requireOwner(`/recipes/${encodeURIComponent(id)}`);
  if (isTestAuthenticationEnabled())
    return demoRecipes.find((recipe) => recipe.id === id) ?? null;

  const client = await createClient();
  const { data, error } = await client
    .from("recipes")
    .select(
      "*,recipe_ingredients(*,ingredients(*)),recipe_steps(*),recipe_tags(tags(name,type))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("The recipe could not be loaded.");
  if (!data) return null;
  const [recipeWithSubstitutions] = await attachRecipeSubstitutions([
    mapRecipe(data),
  ]);
  const [recipe] = await attachSignedImageUrls([recipeWithSubstitutions]);
  return recipe;
}

export async function listIngredients(query = ""): Promise<Ingredient[]> {
  await requireOwner("/ingredients");
  if (isTestAuthenticationEnabled()) {
    const normalized = query.trim().toLocaleLowerCase("en-US");
    return demoIngredients.filter(
      (item) =>
        !normalized ||
        item.displayName.toLocaleLowerCase("en-US").includes(normalized),
    );
  }
  const client = await createClient();
  const pageSize = 500;
  const rows: unknown[] = [];
  const escapedQuery = query
    .trim()
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
  for (let offset = 0; ; offset += pageSize) {
    let request = client
      .from("ingredients")
      .select("*")
      .order("display_name")
      .order("id")
      .range(offset, offset + pageSize - 1);
    if (escapedQuery) {
      request = request.ilike("display_name", `%${escapedQuery}%`);
    }
    const { data, error } = await request;
    if (error) throw new Error("Ingredients could not be loaded.");
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows.map(mapIngredient);
}

export async function listPantry(): Promise<PantryItem[]> {
  await requireOwner("/pantry");
  if (isTestAuthenticationEnabled()) return demoPantry;
  const client = await createClient();
  const { data, error } = await client
    .from("pantry_items")
    .select("*,ingredients(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Pantry items could not be loaded.");
  const items = (data ?? []).map(mapPantryItem);
  const { data: ingredients, error: ingredientsError } = await client
    .from("ingredients")
    .select("*")
    .in("normalized_name", pantryStarters.map((starter) => starter.slug));
  if (ingredientsError) throw new Error("Pantry starters could not be loaded.");
  const stockedIngredientIds = new Set(items.map((item) => item.ingredientId));
  const starterItems = (ingredients ?? [])
    .map(mapIngredient)
    .filter((ingredient) => !stockedIngredientIds.has(ingredient.id))
    .map((ingredient) => ({
      id: `starter:${ingredient.id}`,
      ingredientId: ingredient.id,
      ingredient,
      quantity: 0,
      unit: ingredient.defaultUnit,
      storageLocation: "pantry" as StorageLocation,
      expirationDate: null,
      lowStock: false,
      isDepleted: true,
      notes: null,
      createdAt: "",
      updatedAt: "",
    }));
  return [...items, ...starterItems];
}

export async function listShoppingItems(): Promise<ShoppingListItem[]> {
  await requireOwner("/shopping-list");
  if (isTestAuthenticationEnabled()) return demoShopping;
  const client = await createClient();
  const { data, error } = await client
    .from("shopping_list_items")
    .select("*,ingredients(display_name,canonical_name),recipes(title)")
    .order("is_completed")
    .order("created_at", { ascending: false });
  if (error) throw new Error("The shopping list could not be loaded.");
  return (data ?? []).map((value) => {
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
  });
}

export async function listRecipesForMatching(): Promise<Recipe[]> {
  await requireOwner("/cook-with-what-i-have");
  if (isTestAuthenticationEnabled()) return demoRecipes;
  const client = await createClient();
  const { data, error } = await client
    .from("recipes")
    .select(
      "*,recipe_ingredients(*,ingredients(*)),recipe_steps(*),recipe_tags(tags(name,type))",
    )
    .eq("status", "published");
  if (error) throw new Error("Recipes could not be prepared for matching.");
  return attachRecipeSubstitutions((data ?? []).map(mapRecipe));
}

export async function getUserSettings(): Promise<SettingsValues> {
  await requireOwner("/settings");
  const defaults: SettingsValues = {
    theme: "system",
    defaultServings: 2,
    measurementPreference: "original",
    stapleIngredientIds: [],
    additionalStapleNames: [],
    reduceMotion: false,
    enabledRetailers: ["spar-si", "hofer-si", "lidl-si"],
    preferredRetailer: null,
    allowLoyaltyPrices: false,
    allowSplitBasket: true,
    preferPromotions: true,
    preferredBrands: [],
    excludedBrands: [],
  };
  if (isTestAuthenticationEnabled()) return defaults;
  const client = await createClient();
  const { data, error } = await client
    .from("user_preferences")
    .select(
      "theme,default_servings,measurement_preference,staple_ingredient_ids,additional_staple_names,reduce_motion,enabled_retailers,preferred_retailer,allow_loyalty_prices,allow_split_basket,prefer_promotions,preferred_brands,excluded_brands",
    )
    .maybeSingle();
  if (error || !data) return defaults;
  const { settingsSchema } = await import("@/lib/validation");
  const parsed = settingsSchema.safeParse({
    theme: data.theme,
    defaultServings: Number(data.default_servings),
    measurementPreference: data.measurement_preference,
    stapleIngredientIds: data.staple_ingredient_ids,
    additionalStapleNames: data.additional_staple_names,
    reduceMotion: data.reduce_motion,
    enabledRetailers: data.enabled_retailers,
    preferredRetailer: data.preferred_retailer,
    allowLoyaltyPrices: data.allow_loyalty_prices,
    allowSplitBasket: data.allow_split_basket,
    preferPromotions: data.prefer_promotions,
    preferredBrands: data.preferred_brands,
    excludedBrands: data.excluded_brands,
  });
  return parsed.success ? parsed.data : defaults;
}
