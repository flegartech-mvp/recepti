import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { demoPantry, demoRecipes } from "@/lib/data/demo";
import { attachMakeabilityToRecipeSummaries } from "@/lib/data/recipe-makeability";
import { attachSignedImageUrls } from "@/lib/data/storage-urls";
import { createClient } from "@/lib/supabase/server";
import type {
  PaginatedRecipes,
  Recipe,
  RecipeListFilters,
} from "@/types/domain";

import {
  asArray,
  asNumber,
  asRecord,
  mapRecipe,
  mapRecipeSummary,
  mapTags,
  uniqueSortedLabels,
} from "./query-mappers";
import {
  attachRecipeSubstitutions,
  attachRecipeSummaryMakeability,
  attachRecipeSummaryTags,
} from "./recipe-query-hydration";

export interface RecipeFilterOptions {
  cuisines: string[];
  dietaryTags: string[];
}

export async function getRecipeFilterOptions(): Promise<RecipeFilterOptions> {
  await requireOwner("/recipes");
  if (isTestAuthenticationEnabled())
    return {
      cuisines: uniqueSortedLabels(demoRecipes.map((recipe) => recipe.cuisine)),
      dietaryTags: uniqueSortedLabels(
        demoRecipes.flatMap((recipe) => recipe.dietaryTags),
      ),
    };
  const client = await createClient();
  const [cuisineResult, tagResult] = await Promise.all([
    client.from("recipes").select("cuisine").not("cuisine", "is", null),
    client.from("recipe_tags").select("tags(name,type)"),
  ]);
  if (cuisineResult.error || tagResult.error)
    throw new Error("Recipe filters could not be loaded.");
  return {
    cuisines: uniqueSortedLabels(
      (cuisineResult.data ?? []).map((row) => row.cuisine),
    ),
    dietaryTags: uniqueSortedLabels(
      (tagResult.data ?? []).flatMap((row) => mapTags([row]).dietaryTags),
    ),
  };
}

function filterDemoRecipes(filters: RecipeListFilters): Recipe[] {
  let recipes = [...demoRecipes];
  const query = filters.query?.trim().toLocaleLowerCase("en-US");
  if (query)
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
  if (filters.favorite) recipes = recipes.filter((recipe) => recipe.isFavorite);
  if (filters.category)
    recipes = recipes.filter((recipe) => recipe.category === filters.category);
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
    const tag = filters.dietaryTag.toLocaleLowerCase("en-US");
    recipes = recipes.filter((recipe) =>
      recipe.dietaryTags.some(
        (value) => value.toLocaleLowerCase("en-US") === tag,
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
  return recipes;
}

export async function listRecipes(
  filters: RecipeListFilters = {},
): Promise<PaginatedRecipes> {
  await requireOwner("/recipes");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(1, filters.pageSize ?? 12));
  if (isTestAuthenticationEnabled()) {
    const recipes = filterDemoRecipes(filters);
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
    p_query: filters.query?.trim() || undefined,
    p_favorite: filters.favorite,
    p_category: filters.category || undefined,
    p_cuisine: filters.cuisine || undefined,
    p_difficulty: filters.difficulty || undefined,
    p_dietary_tag: filters.dietaryTag || undefined,
    p_max_prep_minutes: filters.maxPrepMinutes,
    p_max_total_minutes: filters.maxTotalMinutes,
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
  const [withSubstitutions] = await attachRecipeSubstitutions([
    mapRecipe(data),
  ]);
  const [recipe] = await attachSignedImageUrls([withSubstitutions]);
  return recipe;
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
