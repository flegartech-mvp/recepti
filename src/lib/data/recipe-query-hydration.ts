import { attachMakeabilityToRecipeSummaries } from "@/lib/data/recipe-makeability";
import { dataAccessError } from "@/lib/errors/application-error";
import { createClient } from "@/lib/supabase/server";
import type { PantryItem, Recipe, RecipeIngredient } from "@/types/domain";

import {
  asRecord,
  asString,
  mapPantryItem,
  mapRecipeIngredient,
  mapTags,
  type RecipeSummaryWithImagePath,
} from "./query-mappers";

const PAGE_SIZE = 1_000;
const ID_CHUNK_SIZE = 100;

function chunkIds(ids: readonly string[]): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += ID_CHUNK_SIZE)
    chunks.push(ids.slice(index, index + ID_CHUNK_SIZE));
  return chunks;
}

export async function attachRecipeSummaryTags(
  items: RecipeSummaryWithImagePath[],
): Promise<RecipeSummaryWithImagePath[]> {
  const ids = items.map((item) => item.id).filter(Boolean);
  if (ids.length === 0) return items;
  const client = await createClient();
  const { data, error } = await client
    .from("recipe_tags")
    .select("recipe_id,tags(name,type)")
    .in("recipe_id", ids);
  if (error) throw dataAccessError("load recipe tags", error);
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

export async function attachRecipeSubstitutions(
  recipes: Recipe[],
): Promise<Recipe[]> {
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
      unit:
        typeof row.substitute_unit === "string" ? row.substitute_unit : null,
      note: typeof row.notes === "string" ? row.notes : null,
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

export async function attachRecipeSummaryMakeability(
  items: RecipeSummaryWithImagePath[],
): Promise<RecipeSummaryWithImagePath[]> {
  const recipeIds = items.map((item) => item.id).filter(Boolean);
  if (recipeIds.length === 0) return items;
  const client = await createClient();
  const ingredientRows: unknown[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await client
      .from("recipe_ingredients")
      .select(
        "recipe_id,ingredient_id,quantity,unit,display_name,preparation_note,is_optional,is_garnish,section_name,sort_order,ingredients(id,canonical_name,display_name,normalized_name,is_staple)",
      )
      .in("recipe_id", recipeIds)
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error)
      throw new Error("Recipe makeability requirements could not be loaded.");
    ingredientRows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }
  const pantryCountResult = await client
    .from("pantry_items")
    .select("id", { count: "exact", head: true })
    .eq("is_depleted", false);
  if (pantryCountResult.error)
    throw new Error("Pantry availability could not be checked.");
  if ((pantryCountResult.count ?? 0) === 0) return items;

  const sourceIds = [
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
  const relevantIds = new Set(sourceIds);
  for (const ids of chunkIds(sourceIds)) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await client
        .from("ingredient_substitutions")
        .select(
          "ingredient_id,substitute_ingredient_id,substitute_unit,notes,substitute:ingredients!ingredient_substitutions_target_fk(id,canonical_name,display_name,normalized_name)",
        )
        .in("ingredient_id", ids)
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1);
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
        relevantIds.add(targetId);
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
          unit:
            typeof row.substitute_unit === "string"
              ? row.substitute_unit
              : null,
          note: typeof row.notes === "string" ? row.notes : null,
        });
        substitutionsByIngredient.set(sourceId, substitutions);
      }
      if ((data?.length ?? 0) < PAGE_SIZE) break;
    }
  }

  const pantry: PantryItem[] = [];
  for (const ids of chunkIds([...relevantIds])) {
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await client
        .from("pantry_items")
        .select("*,ingredients(*)")
        .eq("is_depleted", false)
        .in("ingredient_id", ids)
        .order("id")
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw new Error("Pantry availability could not be loaded.");
      pantry.push(...(data ?? []).map(mapPantryItem));
      if ((data?.length ?? 0) < PAGE_SIZE) break;
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
  const recipes = items.map((item) => ({
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
    recipes,
    pantry,
    true,
  ) as RecipeSummaryWithImagePath[];
}
