import { familyNotebookCookbook } from "@/data/family-notebook-cookbook";
import { normalizeRecipeTitle } from "@/lib/data/cookbook-import";
import { cookbookExportSchema, type CookbookExport } from "@/lib/validation";
import type { SettingsValues } from "@/lib/validation/settings";

export interface FamilyNotebookImportPreview {
  totalRecipes: number;
  importableRecipes: number;
  skippedRecipes: number;
  importableRecipeTitles: string[];
  skippedRecipeTitles: string[];
  allImported: boolean;
}

export interface FamilyNotebookImportPlan {
  preview: FamilyNotebookImportPreview;
  payload: CookbookExport;
}

/**
 * Filters only the reviewed bundle. The normal backup importer keeps its
 * stricter duplicate-blocking behavior.
 */
export function createFamilyNotebookImportPlan(
  existingRecipeTitles: readonly string[],
  currentSettings: SettingsValues,
): FamilyNotebookImportPlan {
  const existing = new Set(
    existingRecipeTitles.map((title) => normalizeRecipeTitle(title)),
  );
  const recipes = familyNotebookCookbook.recipes.filter(
    (recipe) => !existing.has(normalizeRecipeTitle(recipe.title)),
  );
  const skippedRecipeTitles = familyNotebookCookbook.recipes
    .filter((recipe) => existing.has(normalizeRecipeTitle(recipe.title)))
    .map((recipe) => recipe.title);
  const ingredientIds = new Set(
    recipes.flatMap((recipe) =>
      recipe.ingredients.map((item) => item.ingredientId),
    ),
  );
  const ingredients = familyNotebookCookbook.ingredients.filter((item) =>
    ingredientIds.has(item.id),
  );

  const payload = cookbookExportSchema.parse({
    ...familyNotebookCookbook,
    exportedAt: new Date().toISOString(),
    ingredients,
    recipes,
    settings: currentSettings,
  });

  return {
    preview: {
      totalRecipes: familyNotebookCookbook.recipes.length,
      importableRecipes: recipes.length,
      skippedRecipes: skippedRecipeTitles.length,
      importableRecipeTitles: recipes.map((recipe) => recipe.title),
      skippedRecipeTitles,
      allImported: recipes.length === 0,
    },
    payload,
  };
}
