import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { demoPantry, demoRecipes } from "@/lib/data/demo";
import { attachSignedImageUrls } from "@/lib/data/storage-urls";
import { rankRecipes } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/types/domain";

import { mapPantryItem, mapRecipe, mapRecipeSummary } from "./query-mappers";
import { attachRecipeSubstitutions } from "./recipe-query-hydration";

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
    recipeCountResult,
    favoriteCountResult,
    recentResult,
    cookedResult,
    pantryResult,
    matchingResult,
  ] = await Promise.all([
    client.from("recipes").select("id", { count: "exact", head: true }),
    client
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("is_favorite", true),
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
    recipeCountResult.error ||
    favoriteCountResult.error ||
    recentResult.error ||
    cookedResult.error ||
    pantryResult.error ||
    matchingResult.error
  )
    throw new Error("Cookbook dashboard data could not be loaded.");
  const recent = (recentResult.data ?? []).map(mapRecipeSummary);
  const cooked = (cookedResult.data ?? []).map(mapRecipeSummary);
  const summaries = await attachSignedImageUrls([...recent, ...cooked]);
  const pantry = (pantryResult.data ?? []).map(mapPantryItem);
  const recipes = await attachRecipeSubstitutions(
    (matchingResult.data ?? []).map(mapRecipe),
  );
  return {
    recipeCount: recipeCountResult.count ?? 0,
    favoriteCount: favoriteCountResult.count ?? 0,
    pantryCount: pantry.length,
    makeableCount: rankRecipes(recipes, pantry, {
      ignoreStaples: true,
    }).filter((result) => result.category === "ready_to_cook").length,
    recentRecipes: summaries.slice(0, recent.length),
    recentlyCooked: summaries.slice(recent.length),
  };
}
