import { describe, expect, it } from "vitest";

import {
  ingredientIdentityKey,
  ingredientsShareIdentity,
  normalizeIngredientName,
  uniqueNormalizedIngredientNames,
} from "@/lib/domain/ingredients";

describe("ingredient normalization", () => {
  it("normalizes typography, case, invisible characters, and whitespace", () => {
    expect(normalizeIngredientName("  BLACK\u00A0\u200B  Pepper  ")).toBe(
      "black pepper",
    );
    expect(normalizeIngredientName("Baker’s  Yeast")).toBe("baker's yeast");
    expect(normalizeIngredientName("Sugar–snap peas")).toBe("sugar-snap peas");
  });

  it("normalizes equivalent Unicode composition while preserving accents", () => {
    expect(normalizeIngredientName("C\u030CESEN")).toBe("česen");
    expect(normalizeIngredientName("Česen")).toBe("česen");
    expect(normalizeIngredientName("paradižnik")).not.toBe(
      normalizeIngredientName("paradiznik"),
    );
  });

  it("does not guess singulars or erase meaningful punctuation", () => {
    expect(normalizeIngredientName("mushrooms")).not.toBe(
      normalizeIngredientName("mushroom"),
    );
    expect(normalizeIngredientName("chili-oil")).not.toBe(
      normalizeIngredientName("chili oil"),
    );
  });

  it("uses catalog IDs as the strongest identity", () => {
    const left = { ingredientId: "A", name: "Chili" };
    const sameId = { ingredientId: "a", name: "Different label" };
    const differentId = { ingredientId: "B", name: "Chili" };

    expect(ingredientsShareIdentity(left, sameId)).toBe(true);
    expect(ingredientsShareIdentity(left, differentId)).toBe(false);
    expect(ingredientIdentityKey(left)).toBe("id:a");
  });

  it("matches explicit aliases when one side has no authoritative ID", () => {
    expect(
      ingredientsShareIdentity(
        { name: "scallion", aliases: ["spring onion"] },
        { name: "Spring Onion" },
      ),
    ).toBe(true);
  });

  it("deduplicates only normalized equivalents", () => {
    expect(
      uniqueNormalizedIngredientNames([" Salt ", "salt", "SALT", "sea salt"]),
    ).toEqual(["salt", "sea salt"]);
  });
});
