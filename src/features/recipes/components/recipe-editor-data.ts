import {
  emptyIngredient,
  emptyStep,
  type EditorValues,
} from "@/features/recipes/components/recipe-editor-types";
import type { RecipeInput } from "@/lib/validation";
import type { Recipe } from "@/types/domain";

export const isRecipeUuid = (value: string | undefined) =>
  Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ),
  );

export function initialRecipeValues(
  recipe?: Recipe,
  defaultServings = 2,
): EditorValues {
  return {
    revision: recipe?.revision ?? null,
    title: recipe?.title ?? "",
    description: recipe?.description ?? "",
    category: recipe?.category ?? "dinner",
    cuisine: recipe?.cuisine ?? "",
    difficulty: recipe?.difficulty ?? "easy",
    prepMinutes: String(recipe?.prepMinutes ?? 0),
    cookMinutes: String(recipe?.cookMinutes ?? 0),
    restMinutes: String(recipe?.restMinutes ?? 0),
    servings: String(recipe?.servings ?? defaultServings),
    dietaryTags: recipe?.dietaryTags.join(", ") ?? "",
    customTags: recipe?.customTags.join(", ") ?? "",
    sourceName: recipe?.sourceName ?? "",
    sourceUrl: recipe?.sourceUrl ?? "",
    notes: recipe?.notes ?? "",
    isFavorite: recipe?.isFavorite ?? false,
    imagePath: recipe?.imagePath ?? "",
    ingredients: recipe?.ingredients.map((item) => ({
      id: isRecipeUuid(item.id) ? item.id : undefined,
      ingredientId: isRecipeUuid(item.ingredientId) ? item.ingredientId : "",
      canonicalName: item.canonicalName,
      displayName: item.displayName,
      quantity: item.quantity === null ? "" : String(item.quantity),
      unit: item.unit ?? "",
      preparationNote: item.preparationNote ?? "",
      isOptional: item.isOptional,
      isGarnish: item.isGarnish,
      sectionName: item.sectionName ?? "",
    })) ?? [emptyIngredient()],
    steps: recipe?.steps.map((step) => ({
      id: isRecipeUuid(step.id) ? step.id : undefined,
      instruction: step.instruction,
      timerMinutes: step.timerSeconds
        ? String(Math.round(step.timerSeconds / 60))
        : "",
    })) ?? [emptyStep()],
  };
}

export interface StoredEditorDraft {
  recipeUpdatedAt: string | null;
  values: Partial<EditorValues>;
}

export function readStoredDraft(
  stored: string,
  recipe?: Recipe,
): Partial<EditorValues> | null {
  const parsed = JSON.parse(stored) as
    Partial<EditorValues> | StoredEditorDraft;
  if ("values" in parsed) return parsed.values;
  return recipe ? null : parsed;
}

export function uploadRecipeImage(
  file: File,
  onProgress: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/images");
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      const response = JSON.parse(request.responseText || "{}") as {
        path?: string;
        error?: string;
      };
      if (request.status >= 200 && request.status < 300 && response.path)
        resolve(response.path);
      else
        reject(new Error(response.error ?? "The image could not be uploaded."));
    });
    request.addEventListener("error", () =>
      reject(new Error("The image upload was interrupted.")),
    );
    const body = new FormData();
    body.set("file", file);
    request.send(body);
  });
}

export async function removeUploadedRecipeImage(
  path: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `/api/images?path=${encodeURIComponent(path)}`,
      { method: "DELETE" },
    );
    return response.ok;
  } catch {
    return false;
  }
}

const splitTags = (value: string) =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

export function buildRecipeInput(
  values: EditorValues,
  imagePath: string,
  intent: "draft" | "continue" | "finish",
): RecipeInput {
  return {
    title: values.title,
    description: values.description,
    imagePath,
    category: values.category,
    cuisine: values.cuisine,
    difficulty: values.difficulty,
    prepMinutes: Number(values.prepMinutes || 0),
    cookMinutes: Number(values.cookMinutes || 0),
    restMinutes: Number(values.restMinutes || 0),
    servings: Number(values.servings || 2),
    dietaryTags: splitTags(values.dietaryTags),
    customTags: splitTags(values.customTags),
    sourceName: values.sourceName,
    sourceUrl: values.sourceUrl,
    notes: values.notes,
    isFavorite: values.isFavorite,
    status: intent === "draft" ? "draft" : "published",
    ingredients: values.ingredients
      .filter((item) => item.canonicalName.trim())
      .map((item, index) => ({
        id: isRecipeUuid(item.id) ? item.id : undefined,
        ingredientId: isRecipeUuid(item.ingredientId)
          ? item.ingredientId
          : undefined,
        canonicalName: item.canonicalName,
        displayName: item.displayName || item.canonicalName,
        quantity: item.quantity,
        unit: item.unit,
        preparationNote: item.preparationNote,
        isOptional: item.isOptional,
        isGarnish: item.isGarnish,
        sectionName: item.sectionName,
        sortOrder: index,
      })),
    steps: values.steps
      .filter((step) => step.instruction.trim())
      .map((step, index) => ({
        id: isRecipeUuid(step.id) ? step.id : undefined,
        instruction: step.instruction,
        timerMinutes: step.timerMinutes ? Number(step.timerMinutes) : null,
        sortOrder: index,
      })),
  };
}
