/** @vitest-environment jsdom */

import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { RecipeCard } from "@/features/recipes/components/recipe-card";
import type { RecipeSummary } from "@/types/domain";

const recipe = (matchPercentage?: number): RecipeSummary => ({
  id: "recipe-one",
  title: "Tomato supper",
  description: "A quick pantry supper.",
  imageUrl: null,
  category: "dinner",
  cuisine: null,
  difficulty: "easy",
  totalMinutes: 20,
  isFavorite: false,
  status: "published",
  cookedCount: 0,
  lastCookedAt: null,
  createdAt: "2026-07-15T12:00:00.000Z",
  updatedAt: "2026-07-15T12:00:00.000Z",
  dietaryTags: [],
  customTags: [],
  matchPercentage,
});

describe("RecipeCard pantry indicator", () => {
  afterEach(cleanup);

  it("does not render an indicator without pantry-derived data", () => {
    render(createElement(RecipeCard, { recipe: recipe() }));

    expect(screen.queryByLabelText(/pantry match/i)).toBeNull();
  });

  it("renders a zero-percent result in grid and compact views", () => {
    const { rerender } = render(
      createElement(RecipeCard, { recipe: recipe(0) }),
    );
    expect(screen.getByLabelText("0% pantry match")).toBeTruthy();

    rerender(createElement(RecipeCard, { recipe: recipe(0), compact: true }));
    expect(screen.getByLabelText("0% pantry match")).toBeTruthy();
  });
});
