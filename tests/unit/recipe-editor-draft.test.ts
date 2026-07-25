import { describe, expect, it } from "vitest";

import { readStoredDraft } from "@/features/recipes/components/recipe-editor";
import type { Recipe } from "@/types/domain";

describe("recipe editor conflict draft", () => {
  it("restores local values even when the server recipe has a newer revision", () => {
    const recipe = {
      revision: 9,
      updatedAt: "2026-07-25T20:00:00.000Z",
    } as Recipe;
    const stored = JSON.stringify({
      recipeUpdatedAt: "2026-07-25T19:00:00.000Z",
      values: {
        revision: 8,
        title: "My unsaved local title",
        ingredients: [],
        steps: [],
      },
    });

    expect(readStoredDraft(stored, recipe)).toMatchObject({
      revision: 8,
      title: "My unsaved local title",
    });
  });
});
