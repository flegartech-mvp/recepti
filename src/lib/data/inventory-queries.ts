import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import {
  pantryStarterItems,
  withStarterIngredients,
} from "@/data/pantry-starters";
import { demoIngredients, demoPantry, demoShopping } from "@/lib/data/demo";
import { normalizeIngredientSearch } from "@/lib/domain/ingredient-search";
import { createClient } from "@/lib/supabase/server";
import type { Ingredient, PantryItem, ShoppingListItem } from "@/types/domain";

import { mapIngredient, mapPantryItem, mapShoppingItem } from "./query-mappers";

export async function listIngredients(
  query = "",
  limit = 100,
  offset = 0,
): Promise<Ingredient[]> {
  await requireOwner("/ingredients");
  if (isTestAuthenticationEnabled()) {
    const normalized = normalizeIngredientSearch(query);
    return withStarterIngredients(demoIngredients).filter((item) => {
      const searchable = [
        item.canonicalName,
        item.displayName,
        item.normalizedName,
        ...item.aliases,
      ].map(normalizeIngredientSearch);
      return (
        !normalized || searchable.some((value) => value.includes(normalized))
      );
    });
  }
  const client = await createClient();
  const boundedLimit = Math.min(100, Math.max(1, limit));
  const boundedOffset = Math.max(0, offset);
  if (query.trim()) {
    const { data, error } = await client.rpc("search_ingredients", {
      p_query: query,
      p_limit: boundedLimit,
      p_offset: boundedOffset,
    });
    if (error) throw new Error("Ingredients could not be searched.");
    return (data ?? []).map(mapIngredient);
  }
  const { data, error } = await client
    .from("ingredients")
    .select("*")
    .order("display_name")
    .order("id")
    .range(boundedOffset, boundedOffset + boundedLimit - 1);
  if (error) throw new Error("Ingredients could not be loaded.");
  return withStarterIngredients((data ?? []).map(mapIngredient));
}

export async function listPantry(): Promise<PantryItem[]> {
  await requireOwner("/pantry");
  if (isTestAuthenticationEnabled())
    return [...demoPantry, ...pantryStarterItems(demoPantry)];
  const client = await createClient();
  const { data, error } = await client
    .from("pantry_items")
    .select("*,ingredients(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Pantry items could not be loaded.");
  const items = (data ?? []).map(mapPantryItem);
  return [...items, ...pantryStarterItems(items)];
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
  return (data ?? []).map(mapShoppingItem);
}
