import { describe, expect, it } from "vitest";

import { collectRecipeEditorValidationMessages } from "@/features/recipes/components/recipe-editor-validation";

describe("recipe editor validation message mapping", () => {
  it("maps compact ingredient and step errors back to their editor rows", () => {
    expect(
      collectRecipeEditorValidationMessages(
        [
          {
            path: ["ingredients", 0, "quantity"],
            message: "Quantity cannot be negative.",
          },
          {
            path: ["steps", 0, "timerMinutes"],
            message: "Timer cannot be negative.",
          },
        ],
        { ingredients: [2], steps: [1] },
      ),
    ).toEqual({
      "ingredients.2.quantity": "Quantity cannot be negative.",
      "steps.1.timerMinutes": "Timer cannot be negative.",
    });
  });

  it("leaves collection and top-level paths unchanged", () => {
    expect(
      collectRecipeEditorValidationMessages(
        [
          { path: ["ingredients"], message: "Add an ingredient." },
          { path: ["title"], message: "Add a title." },
          { path: [], message: "Check the form." },
        ],
        { ingredients: [], steps: [] },
      ),
    ).toEqual({
      ingredients: "Add an ingredient.",
      title: "Add a title.",
      form: "Check the form.",
    });
  });
});
