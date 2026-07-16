export type RecipeStatus = "draft" | "published";
export type Difficulty = "easy" | "medium" | "challenging";
export type MealCategory =
  | "breakfast"
  | "lunch"
  | "dinner"
  | "snack"
  | "dessert"
  | "side"
  | "drink"
  | "other";
export type IngredientCategory =
  | "produce"
  | "meat"
  | "seafood"
  | "dairy"
  | "eggs"
  | "grains"
  | "pasta"
  | "baking"
  | "spices"
  | "herbs"
  | "condiments"
  | "oils"
  | "canned_goods"
  | "frozen"
  | "beverages"
  | "other";
export type StorageLocation =
  "fridge" | "freezer" | "pantry" | "counter" | "other";

export interface Ingredient {
  id: string;
  canonicalName: string;
  displayName: string;
  normalizedName: string;
  category: IngredientCategory;
  defaultUnit: string | null;
  aliases: string[];
  isStaple: boolean;
  notes: string | null;
  recipeCount?: number;
}

export interface RecipeIngredient {
  id: string;
  ingredientId: string;
  canonicalName: string;
  displayName: string;
  normalizedName: string;
  quantity: number | null;
  unit: string | null;
  preparationNote: string | null;
  isOptional: boolean;
  isGarnish: boolean;
  sectionName: string | null;
  sortOrder: number;
  isStaple?: boolean;
  substitutions?: Array<{
    ingredientId: string;
    canonicalName: string;
    displayName: string;
    normalizedName: string;
    quantity?: number | null;
    unit?: string | null;
    note?: string | null;
  }>;
}

export interface RecipeStep {
  id: string;
  instruction: string;
  timerSeconds: number | null;
  imagePath: string | null;
  sortOrder: number;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  category: MealCategory;
  cuisine: string | null;
  difficulty: Difficulty;
  prepMinutes: number;
  cookMinutes: number;
  restMinutes: number;
  totalMinutes: number;
  servings: number;
  sourceName: string | null;
  sourceUrl: string | null;
  notes: string | null;
  isFavorite: boolean;
  status: RecipeStatus;
  cookedCount: number;
  lastCookedAt: string | null;
  createdAt: string;
  updatedAt: string;
  dietaryTags: string[];
  customTags: string[];
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  matchPercentage?: number;
  missingIngredientNames?: string[];
}

export type RecipeSummary = Pick<
  Recipe,
  | "id"
  | "title"
  | "description"
  | "imageUrl"
  | "category"
  | "cuisine"
  | "difficulty"
  | "totalMinutes"
  | "isFavorite"
  | "status"
  | "cookedCount"
  | "lastCookedAt"
  | "createdAt"
  | "updatedAt"
  | "dietaryTags"
  | "customTags"
  | "matchPercentage"
  | "missingIngredientNames"
>;

export interface PantryItem {
  id: string;
  ingredientId: string;
  ingredient: Ingredient;
  quantity: number | null;
  unit: string | null;
  storageLocation: StorageLocation;
  expirationDate: string | null;
  lowStock: boolean;
  isDepleted: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingListItem {
  id: string;
  ingredientId: string | null;
  ingredientName: string;
  quantity: number | null;
  unit: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
}

export interface DashboardData {
  recipeCount: number;
  favoriteCount: number;
  pantryCount: number;
  makeableCount: number;
  recentRecipes: RecipeSummary[];
  recentlyCooked: RecipeSummary[];
}

export interface RecipeListFilters {
  query?: string;
  favorite?: boolean;
  category?: string;
  cuisine?: string;
  difficulty?: string;
  dietaryTag?: string;
  maxPrepMinutes?: number;
  maxTotalMinutes?: number;
  sort?:
    | "newest"
    | "oldest"
    | "alphabetical"
    | "recently_cooked"
    | "most_cooked"
    | "shortest";
  page?: number;
  pageSize?: number;
}

export interface PaginatedRecipes {
  recipes: RecipeSummary[];
  total: number;
  page: number;
  pageSize: number;
}
