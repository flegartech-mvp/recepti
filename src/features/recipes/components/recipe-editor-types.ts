import type { MealCategory } from "@/types/domain";

export interface EditorIngredient {
  id?: string;
  ingredientId: string;
  canonicalName: string;
  displayName: string;
  quantity: string;
  unit: string;
  preparationNote: string;
  isOptional: boolean;
  isGarnish: boolean;
  sectionName: string;
}

export interface EditorStep {
  id?: string;
  instruction: string;
  timerMinutes: string;
}

export interface EditorValues {
  title: string;
  description: string;
  category: MealCategory;
  cuisine: string;
  difficulty: "easy" | "medium" | "challenging";
  prepMinutes: string;
  cookMinutes: string;
  restMinutes: string;
  servings: string;
  dietaryTags: string;
  customTags: string;
  sourceName: string;
  sourceUrl: string;
  notes: string;
  isFavorite: boolean;
  imagePath: string;
  ingredients: EditorIngredient[];
  steps: EditorStep[];
}

export const emptyIngredient = (): EditorIngredient => ({
  ingredientId: "",
  canonicalName: "",
  displayName: "",
  quantity: "",
  unit: "",
  preparationNote: "",
  isOptional: false,
  isGarnish: false,
  sectionName: "",
});

export const emptyStep = (): EditorStep => ({
  instruction: "",
  timerMinutes: "",
});
