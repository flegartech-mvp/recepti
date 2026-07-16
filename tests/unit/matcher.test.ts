import { describe, expect, expectTypeOf, it } from "vitest";

import {
  matchRecipe,
  rankRecipes,
  type AvailableIngredient,
  type MatchRecipeIngredient,
  type MatchableRecipe,
} from "@/lib/domain/matcher";
import type { PantryItem, Recipe } from "@/types/domain";

const ingredient = (
  name: string,
  overrides: Partial<MatchRecipeIngredient> = {},
): MatchRecipeIngredient => ({ name, ...overrides });

const pantryIngredient = (
  name: string,
  overrides: Partial<AvailableIngredient> = {},
): AvailableIngredient => ({ name, ...overrides });

const recipe = (
  ingredients: readonly MatchRecipeIngredient[],
  overrides: Partial<MatchableRecipe> = {},
): MatchableRecipe => ({
  id: "recipe-1",
  title: "Test recipe",
  totalMinutes: 30,
  ingredients,
  ...overrides,
});

describe("deterministic recipe matcher", () => {
  it("is structurally compatible with shared recipe and pantry domain models", () => {
    expectTypeOf<Recipe>().toMatchTypeOf<MatchableRecipe>();
    expectTypeOf<PantryItem>().toMatchTypeOf<AvailableIngredient>();
  });

  // Edge case: a complete identity and compatible-quantity match is always first-class ready.
  it("classifies a complete match as ready to cook", () => {
    const result = matchRecipe(
      recipe([
        ingredient("Flour", { quantity: 500, unit: "g" }),
        ingredient("Milk", { quantity: 500, unit: "ml" }),
        ingredient("Egg", { quantity: 2, unit: "piece" }),
      ]),
      [
        pantryIngredient("flour", { quantity: 0.75, unit: "kg" }),
        pantryIngredient("milk", { quantity: 1, unit: "l" }),
        pantryIngredient("egg", { quantity: 6, unit: "piece" }),
      ],
    );

    expect(result.category).toBe("ready_to_cook");
    expect(result.matchPercentage).toBe(100);
    expect(result.matchedIngredientCount).toBe(3);
    expect(result.reason).toContain("All 3 required ingredients");
  });

  // Edge case: one absent canonical ingredient reduces the identity score exactly once.
  it("reports a recipe missing one ingredient as almost ready", () => {
    const result = matchRecipe(
      recipe([ingredient("flour"), ingredient("milk"), ingredient("egg")]),
      [pantryIngredient("flour"), pantryIngredient("milk")],
    );

    expect(result.category).toBe("almost_ready");
    expect(result.matchPercentage).toBe(67);
    expect(result.missingIngredients.map((item) => item.name)).toEqual(["egg"]);
    expect(result.unavailableIngredientCount).toBe(1);
  });

  // Edge case: an optional/garnish row never enters the denominator.
  it("does not penalize a missing optional or garnish ingredient", () => {
    const result = matchRecipe(
      recipe([
        ingredient("pasta"),
        ingredient("parsley", { isOptional: true }),
        ingredient("lemon zest", { isGarnish: true }),
      ]),
      [pantryIngredient("pasta")],
    );

    expect(result.category).toBe("ready_to_cook");
    expect(result.matchPercentage).toBe(100);
    expect(result.requiredIngredientCount).toBe(1);
    expect(result.ignoredIngredients).toHaveLength(2);
  });

  // Edge case: an explicit exclusion wins even when that ingredient is in the pantry.
  it("treats an excluded ingredient as unavailable", () => {
    const result = matchRecipe(
      recipe([ingredient("egg"), ingredient("flour")]),
      [pantryIngredient("egg"), pantryIngredient("flour")],
      { excludedIngredients: ["egg"] },
    );

    expect(result.category).toBe("almost_ready");
    expect(result.matchPercentage).toBe(50);
    expect(result.missingIngredients[0]?.status).toBe("excluded");
  });

  // Edge case: accidental duplicate recipe rows and pantry rows must not inflate counts.
  it("groups duplicate normalized names and aggregates compatible quantities", () => {
    const result = matchRecipe(
      recipe([
        ingredient(" Tomato ", { quantity: 100, unit: "g" }),
        ingredient("tomato", { quantity: 0.1, unit: "kg" }),
      ]),
      [
        pantryIngredient("TOMATO", { quantity: 125, unit: "g" }),
        pantryIngredient("tomato", { quantity: 0.1, unit: "kg" }),
      ],
    );

    expect(result.category).toBe("ready_to_cook");
    expect(result.requiredIngredientCount).toBe(1);
    expect(result.matchedIngredientCount).toBe(1);
    expect(result.availableIngredients[0]?.requiredQuantity).toBe(200);
  });

  // Edge case: names use conservative Unicode/case/whitespace normalization.
  it("matches normalized names while preserving accented canonical identity", () => {
    const result = matchRecipe(recipe([ingredient("  ČESEN ")]), [
      pantryIngredient("C\u030Cesen"),
    ]);

    expect(result.category).toBe("ready_to_cook");
    expect(result.matchPercentage).toBe(100);
  });

  it("accepts shared Recipe and nested PantryItem ingredient shapes directly", () => {
    const result = matchRecipe(
      recipe([
        {
          ingredientId: "ingredient-1",
          canonicalName: "Spring onion",
          displayName: "spring onions",
          quantity: 2,
          unit: "piece",
        },
      ]),
      [
        {
          ingredientId: "ingredient-1",
          ingredient: {
            id: "ingredient-1",
            canonicalName: "Spring onion",
            displayName: "spring onions",
          },
          quantity: 4,
          unit: "piece",
        },
      ],
    );

    expect(result.category).toBe("ready_to_cook");
    expect(result.availableIngredients[0]?.name).toBe("spring onions");
  });

  // Edge case: staples are ignored only when the caller explicitly enables it.
  it("ignores configured staples without hiding missing non-staples", () => {
    const ingredients = [ingredient("salt"), ingredient("egg")];
    const available = [pantryIngredient("egg")];

    expect(matchRecipe(recipe(ingredients), available).matchPercentage).toBe(
      50,
    );
    const ignored = matchRecipe(recipe(ingredients), available, {
      ignoreStaples: true,
    });
    expect(ignored.category).toBe("ready_to_cook");
    expect(ignored.requiredIngredientCount).toBe(1);
    expect(ignored.ignoredIngredients[0]?.status).toBe("ignored_staple");
  });

  // Edge case: identity matches across incompatible units, but exact sufficiency is unknowable.
  it("surfaces incompatible units and never calls the result ready", () => {
    const result = matchRecipe(
      recipe([ingredient("tomato", { quantity: 100, unit: "g" })]),
      [pantryIngredient("tomato", { quantity: 1, unit: "piece" })],
    );

    expect(result.category).toBe("almost_ready");
    expect(result.matchPercentage).toBe(100);
    expect(result.quantityIssues[0]).toMatchObject({
      status: "incompatible_units",
      quantityStatus: "incompatible",
    });
    expect(result.explanations.map((item) => item.code)).toContain(
      "incompatible_units",
    );
  });

  // Edge case: no pantry data yields a useful zero-score result, not an exception.
  it("handles an empty pantry", () => {
    const result = matchRecipe(
      recipe([ingredient("rice"), ingredient("beans")]),
      [],
    );

    expect(result.category).toBe("not_enough_ingredients");
    expect(result.matchPercentage).toBe(0);
    expect(result.missingIngredients).toHaveLength(2);
  });

  // Edge case: a recipe with no required rows is vacuously complete and explained explicitly.
  it("handles an empty recipe ingredient list", () => {
    const result = matchRecipe(recipe([]), []);

    expect(result.category).toBe("ready_to_cook");
    expect(result.matchPercentage).toBe(100);
    expect(result.requiredIngredientCount).toBe(0);
    expect(result.explanations[0]?.code).toBe("no_required_ingredients");
  });

  // Edge case: equal scores are resolved by missing count, time, title, and stable input order.
  it("ranks multiple recipes with equal scores deterministically", () => {
    const recipes = [
      recipe([ingredient("rice"), ingredient("egg")], {
        id: "slow",
        title: "Zesty rice",
        totalMinutes: 40,
      }),
      recipe([ingredient("rice"), ingredient("beans")], {
        id: "fast-b",
        title: "Bean rice",
        totalMinutes: 20,
      }),
      recipe([ingredient("rice"), ingredient("peas")], {
        id: "fast-a",
        title: "Apple rice",
        totalMinutes: 20,
      }),
    ];

    const ranked = rankRecipes(recipes, [pantryIngredient("rice")]);
    expect(ranked.map((result) => result.recipe.id)).toEqual([
      "fast-a",
      "fast-b",
      "slow",
    ]);
    expect(ranked.map((result) => result.rank)).toEqual([1, 2, 3]);
  });

  it("ranks a complete match before a higher-uncertainty non-ready result", () => {
    const complete = recipe([ingredient("rice")], {
      id: "complete",
      title: "Complete",
      totalMinutes: 60,
    });
    const incompatible = recipe(
      [ingredient("tomato", { quantity: 100, unit: "g" })],
      { id: "uncertain", title: "Uncertain", totalMinutes: 5 },
    );

    const ranked = rankRecipes(
      [incompatible, complete],
      [
        pantryIngredient("rice"),
        pantryIngredient("tomato", { quantity: 1, unit: "piece" }),
      ],
    );
    expect(ranked.map((result) => result.recipe.id)).toEqual([
      "complete",
      "uncertain",
    ]);
  });

  it("uses known shortages in the weighted percentage", () => {
    const result = matchRecipe(
      recipe([ingredient("flour", { quantity: 200, unit: "g" })]),
      [pantryIngredient("flour", { quantity: 100, unit: "g" })],
    );

    expect(result.category).toBe("almost_ready");
    expect(result.matchPercentage).toBe(50);
    expect(result.quantityIssues[0]?.status).toBe("insufficient_quantity");
  });

  it("falls back to identity when pantry quantity is unavailable", () => {
    const result = matchRecipe(
      recipe([ingredient("flour", { quantity: 200, unit: "g" })]),
      [pantryIngredient("flour")],
    );

    expect(result.category).toBe("ready_to_cook");
    expect(result.explanations.map((item) => item.code)).toContain(
      "unknown_quantities",
    );
  });

  it("uses only explicitly stored substitutions", () => {
    const withSubstitution = matchRecipe(
      recipe([
        ingredient("butter", {
          substitutions: [{ name: "olive oil", note: "Stored by the owner" }],
        }),
      ]),
      [pantryIngredient("olive oil")],
    );
    const withoutSubstitution = matchRecipe(recipe([ingredient("butter")]), [
      pantryIngredient("olive oil"),
    ]);

    expect(withSubstitution.category).toBe("possible_with_substitutions");
    expect(withSubstitution.matchPercentage).toBe(80);
    expect(withSubstitution.substitutionsUsed[0]?.substitution?.name).toBe(
      "olive oil",
    );
    expect(withoutSubstitution.category).toBe("not_enough_ingredients");
  });

  it("ignores depleted pantry entries and applies result filters", () => {
    const recipes = [
      recipe([ingredient("egg")], {
        id: "breakfast",
        category: "breakfast",
        difficulty: "easy",
        dietaryTags: ["vegetarian"],
        totalMinutes: 10,
      }),
      recipe([ingredient("egg")], {
        id: "dinner",
        category: "dinner",
        difficulty: "hard",
        totalMinutes: 60,
      }),
    ];

    const ranked = rankRecipes(
      recipes,
      [pantryIngredient("egg", { isDepleted: true })],
      {
        filters: {
          categories: ["Breakfast"],
          difficulties: ["easy"],
          dietaryTags: ["vegetarian"],
          maxTotalMinutes: 15,
        },
      },
    );

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.recipe.id).toBe("breakfast");
    expect(ranked[0]?.matchPercentage).toBe(0);
  });
});
