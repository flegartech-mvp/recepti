import type { CookbookExport } from "@/lib/validation";

export interface CookbookImportPreview {
  schemaVersion: number;
  recipes: number;
  ingredients: number;
  pantryItems: number;
  shoppingListItems: number;
  cookingHistory: number;
  imageReferencesSkipped: number;
  duplicateRecipeTitles: string[];
}

export function normalizeRecipeTitle(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

export function createCookbookImportPreview(
  payload: CookbookExport,
  existingRecipeTitles: readonly string[],
): CookbookImportPreview {
  const existing = new Set(existingRecipeTitles.map(normalizeRecipeTitle));
  const seenInBackup = new Set<string>();
  const duplicates = new Set<string>();

  for (const recipe of payload.recipes) {
    const key = normalizeRecipeTitle(recipe.title);
    if (existing.has(key) || seenInBackup.has(key)) {
      duplicates.add(recipe.title);
    }
    seenInBackup.add(key);
  }

  const imageReferencesSkipped = payload.recipes.reduce(
    (count, recipe) =>
      count +
      (recipe.imagePath ? 1 : 0) +
      recipe.steps.filter((step) => Boolean(step.imagePath)).length,
    0,
  );

  return {
    schemaVersion: payload.schemaVersion,
    recipes: payload.recipes.length,
    ingredients: payload.ingredients.length,
    pantryItems: payload.pantryItems.length,
    shoppingListItems: payload.shoppingListItems.length,
    cookingHistory: payload.cookingHistory.length,
    imageReferencesSkipped,
    duplicateRecipeTitles: [...duplicates].slice(0, 20),
  };
}
