import type { RecipeMatchResult } from "@/lib/domain";
import type { Recipe, ShoppingListItem } from "@/types/domain";

export function addMissingIngredients(
  current: readonly ShoppingListItem[],
  recipe: Recipe,
  match: RecipeMatchResult,
): ShoppingListItem[] {
  const next = [...current];

  for (const missing of match.missingIngredients) {
    const ingredientId = missing.key.startsWith("id:")
      ? missing.key.slice(3)
      : null;
    const existing = next.some(
      (item) =>
        item.recipeId === recipe.id &&
        (ingredientId
          ? item.ingredientId === ingredientId
          : item.ingredientName === missing.name),
    );
    if (existing) continue;

    next.push({
      id: `demo-${recipe.id}-${missing.key}`,
      ingredientId,
      ingredientName: missing.name,
      quantity: missing.requiredQuantity,
      unit: missing.requiredUnit,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      isCompleted: false,
      completedAt: null,
      createdAt: new Date().toISOString(),
    });
  }

  return next;
}

export function toggleShoppingItem(
  items: readonly ShoppingListItem[],
  itemId: string,
): ShoppingListItem[] {
  return items.map((item) =>
    item.id === itemId
      ? {
          ...item,
          isCompleted: !item.isCompleted,
          completedAt: item.isCompleted ? null : new Date().toISOString(),
        }
      : item,
  );
}
