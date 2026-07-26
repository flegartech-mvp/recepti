import { getIngredientDefinition } from "@/data/pantry-starters";
import type { SupportedLocale } from "@/data/pantry-starters";
import type { PantryItemInput, RecipeInput } from "@/lib/validation";

export const STARTER_RECIPE_IDS = [
  "tomato-spaghetti",
  "cheese-omelette",
  "chickpea-rice-bowl",
] as const;

export type StarterRecipeId = (typeof STARTER_RECIPE_IDS)[number];

export interface StarterRecipeChoice {
  id: StarterRecipeId;
  title: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  minutes: number;
}

export const starterRecipeChoices: readonly StarterRecipeChoice[] = [
  {
    id: "tomato-spaghetti",
    title: { en: "Quick tomato spaghetti", sl: "Hitri špageti s paradižnikom" },
    description: {
      en: "A dependable pantry dinner with garlic and tomatoes.",
      sl: "Zanesljiva večerja iz shrambe s česnom in paradižnikom.",
    },
    minutes: 25,
  },
  {
    id: "cheese-omelette",
    title: { en: "Cheese omelette", sl: "Sirna omleta" },
    description: {
      en: "A fast breakfast or dinner built around eggs.",
      sl: "Hiter zajtrk ali večerja z jajci.",
    },
    minutes: 15,
  },
  {
    id: "chickpea-rice-bowl",
    title: { en: "Chickpea rice bowl", sl: "Riževa skleda s čičeriko" },
    description: {
      en: "A simple cupboard meal with fresh tomatoes.",
      sl: "Preprost obrok iz shrambe s svežim paradižnikom.",
    },
    minutes: 30,
  },
];

export const PANTRY_GROUPS = [
  {
    id: "fridge",
    title: { en: "Fridge basics", sl: "Osnove iz hladilnika" },
    slugs: ["eggs", "milk", "butter", "cheese"],
  },
  {
    id: "fresh",
    title: { en: "Fresh basics", sl: "Sveže osnove" },
    slugs: ["potatoes", "onions", "garlic", "tomatoes"],
  },
  {
    id: "cupboard",
    title: { en: "Cupboard basics", sl: "Osnove iz shrambe" },
    slugs: [
      "flour",
      "salt",
      "black-pepper",
      "olive-oil",
      "rice",
      "spaghetti",
      "canned-tomatoes",
      "chickpeas",
    ],
  },
] as const;

export const STARTER_PANTRY_SLUGS = PANTRY_GROUPS.flatMap((group) =>
  group.slugs.map(String),
);

export const DEFAULT_STARTER_PANTRY_SLUGS = [
  "eggs",
  "milk",
  "garlic",
  "salt",
  "olive-oil",
  "rice",
  "spaghetti",
  "canned-tomatoes",
] as const;

const pantryQuantities: Record<string, number> = {
  eggs: 6,
  milk: 1_000,
  butter: 250,
  cheese: 300,
  potatoes: 1_000,
  onions: 4,
  garlic: 6,
  tomatoes: 4,
  flour: 1_000,
  salt: 500,
  "black-pepper": 50,
  "olive-oil": 500,
  rice: 1_000,
  spaghetti: 500,
  "canned-tomatoes": 800,
  chickpeas: 800,
};

function ingredient(
  slug: string,
  quantity: number,
  unit?: string,
  optional = false,
) {
  const definition = getIngredientDefinition(slug);
  if (!definition) throw new Error(`Unknown starter ingredient: ${slug}`);
  return {
    canonicalName: definition.names.en,
    displayName: definition.names.en,
    quantity,
    unit: unit ?? definition.defaultUnit,
    preparationNote: null,
    isOptional: optional,
    isGarnish: false,
    sectionName: null,
  };
}

export function getStarterRecipes(
  ids: readonly StarterRecipeId[],
  locale: SupportedLocale,
): RecipeInput[] {
  const recipes: Record<StarterRecipeId, RecipeInput> = {
    "tomato-spaghetti": {
      title:
        locale === "sl"
          ? "Hitri špageti s paradižnikom"
          : "Quick tomato spaghetti",
      description:
        locale === "sl"
          ? "Preprosta večerja iz sestavin, ki jih je dobro imeti pri roki."
          : "A simple dinner made from useful ingredients to keep on hand.",
      category: "dinner",
      cuisine: "Italian",
      difficulty: "easy",
      prepMinutes: 5,
      cookMinutes: 20,
      restMinutes: 0,
      servings: 2,
      dietaryTags: ["vegetarian"],
      customTags: ["starter"],
      sourceName: "Nana's Recipes starter collection",
      sourceUrl: null,
      notes: null,
      isFavorite: false,
      status: "published",
      imagePath: null,
      ingredients: [
        ingredient("spaghetti", 200, "g"),
        ingredient("canned-tomatoes", 400, "g"),
        ingredient("garlic", 2, "clove"),
        ingredient("olive-oil", 20, "ml"),
        ingredient("salt", 5, "g"),
      ],
      steps:
        locale === "sl"
          ? [
              {
                instruction: "Špagete skuhajte v osoljeni vodi.",
                timerMinutes: 10,
              },
              {
                instruction:
                  "Na oljčnem olju na kratko popražite česen, nato dodajte paradižnik in kuhajte 10 minut.",
                timerMinutes: 10,
              },
              {
                instruction: "Špagete premešajte z omako in postrezite.",
                timerMinutes: null,
              },
            ]
          : [
              {
                instruction: "Cook the spaghetti in salted water.",
                timerMinutes: 10,
              },
              {
                instruction:
                  "Gently cook the garlic in olive oil, add the tomatoes, and simmer for 10 minutes.",
                timerMinutes: 10,
              },
              {
                instruction: "Toss the spaghetti with the sauce and serve.",
                timerMinutes: null,
              },
            ],
    },
    "cheese-omelette": {
      title: locale === "sl" ? "Sirna omleta" : "Cheese omelette",
      description:
        locale === "sl"
          ? "Hiter obrok z jajci, mlekom in sirom."
          : "A quick meal with eggs, milk, and cheese.",
      category: "breakfast",
      cuisine: null,
      difficulty: "easy",
      prepMinutes: 5,
      cookMinutes: 10,
      restMinutes: 0,
      servings: 2,
      dietaryTags: ["vegetarian"],
      customTags: ["starter"],
      sourceName: "Nana's Recipes starter collection",
      sourceUrl: null,
      notes: null,
      isFavorite: false,
      status: "published",
      imagePath: null,
      ingredients: [
        ingredient("eggs", 4, "piece"),
        ingredient("milk", 50, "ml"),
        ingredient("cheese", 100, "g"),
        ingredient("butter", 20, "g"),
        ingredient("salt", 3, "g"),
      ],
      steps:
        locale === "sl"
          ? [
              {
                instruction: "Jajca stepite z mlekom in soljo.",
                timerMinutes: null,
              },
              {
                instruction:
                  "V ponvi stopite maslo, prilijte jajca in pecite na zmernem ognju.",
                timerMinutes: 5,
              },
              {
                instruction:
                  "Dodajte sir, omleto prepognite in pecite še 2 minuti.",
                timerMinutes: 2,
              },
            ]
          : [
              {
                instruction: "Whisk the eggs with the milk and salt.",
                timerMinutes: null,
              },
              {
                instruction:
                  "Melt the butter in a pan, add the eggs, and cook over medium heat.",
                timerMinutes: 5,
              },
              {
                instruction:
                  "Add the cheese, fold the omelette, and cook for 2 more minutes.",
                timerMinutes: 2,
              },
            ],
    },
    "chickpea-rice-bowl": {
      title:
        locale === "sl" ? "Riževa skleda s čičeriko" : "Chickpea rice bowl",
      description:
        locale === "sl"
          ? "Preprost obrok z rižem, čičeriko in paradižnikom."
          : "A simple meal with rice, chickpeas, and tomatoes.",
      category: "lunch",
      cuisine: "Mediterranean",
      difficulty: "easy",
      prepMinutes: 10,
      cookMinutes: 20,
      restMinutes: 0,
      servings: 2,
      dietaryTags: ["vegan"],
      customTags: ["starter"],
      sourceName: "Nana's Recipes starter collection",
      sourceUrl: null,
      notes: null,
      isFavorite: false,
      status: "published",
      imagePath: null,
      ingredients: [
        ingredient("rice", 200, "g"),
        ingredient("chickpeas", 400, "g"),
        ingredient("tomatoes", 2, "piece"),
        ingredient("olive-oil", 20, "ml"),
        ingredient("salt", 3, "g"),
      ],
      steps:
        locale === "sl"
          ? [
              {
                instruction: "Riž skuhajte po navodilih na embalaži.",
                timerMinutes: 18,
              },
              {
                instruction:
                  "Čičeriko odcedite, paradižnik narežite in oboje zmešajte z oljčnim oljem ter soljo.",
                timerMinutes: null,
              },
              {
                instruction:
                  "Riž razdelite v skledi in dodajte mešanico s čičeriko.",
                timerMinutes: null,
              },
            ]
          : [
              {
                instruction:
                  "Cook the rice according to the package directions.",
                timerMinutes: 18,
              },
              {
                instruction:
                  "Drain the chickpeas, chop the tomatoes, and mix both with olive oil and salt.",
                timerMinutes: null,
              },
              {
                instruction:
                  "Divide the rice between bowls and add the chickpea mixture.",
                timerMinutes: null,
              },
            ],
    },
  };

  return ids.map((id) => recipes[id]);
}

export function getStarterPantryItems(
  slugs: readonly string[],
): PantryItemInput[] {
  return slugs.map((slug) => {
    const definition = getIngredientDefinition(slug);
    if (!definition || pantryQuantities[slug] == null) {
      throw new Error(`Unknown starter pantry item: ${slug}`);
    }
    return {
      ingredientName: definition.names.en,
      quantity: pantryQuantities[slug],
      unit: definition.defaultUnit,
      storageLocation: definition.storageLocation,
      expirationDate: null,
      notes: null,
      lowStock: false,
      isDepleted: false,
    };
  });
}
