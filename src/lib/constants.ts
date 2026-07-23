import type {
  Difficulty,
  IngredientCategory,
  MealCategory,
  StorageLocation,
} from "@/types/domain";

export const PRODUCT_NAME = "Nana's Recipes";

export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "piece",
  "clove",
  "pinch",
  "slice",
  "can",
  "packet",
  "bunch",
  "handful",
  "to taste",
] as const;

export const MEAL_CATEGORIES: { value: MealCategory; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
  { value: "side", label: "Side" },
  { value: "drink", label: "Drink" },
  { value: "other", label: "Other" },
];

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "challenging", label: "Challenging" },
];

export const INGREDIENT_CATEGORIES: {
  value: IngredientCategory;
  label: string;
}[] = [
  { value: "produce", label: "Produce" },
  { value: "meat", label: "Meat" },
  { value: "seafood", label: "Seafood" },
  { value: "dairy", label: "Dairy" },
  { value: "eggs", label: "Eggs" },
  { value: "grains", label: "Grains" },
  { value: "pasta", label: "Pasta" },
  { value: "baking", label: "Baking" },
  { value: "spices", label: "Spices" },
  { value: "herbs", label: "Herbs" },
  { value: "condiments", label: "Condiments" },
  { value: "oils", label: "Oils" },
  { value: "canned_goods", label: "Canned goods" },
  { value: "frozen", label: "Frozen" },
  { value: "beverages", label: "Beverages" },
  { value: "other", label: "Other" },
];

export const STORAGE_LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: "fridge", label: "Fridge" },
  { value: "freezer", label: "Freezer" },
  { value: "pantry", label: "Pantry" },
  { value: "counter", label: "Counter" },
  { value: "other", label: "Other" },
];

export const DEFAULT_STAPLES = ["salt", "black pepper", "water", "cooking oil"];
