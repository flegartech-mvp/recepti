import { describe, expect, it } from "vitest";

import {
  mapCoverFilename,
  normalizeRecipeCoverName,
} from "../../scripts/import-recipe-covers";

const recipes = [
  {
    title: "Borovničevi mafini",
    slug: "borovnicevi-mafini",
    image_path: null,
  },
  {
    title: "Skutne kocke z limono in jagodami",
    slug: "skutne-kocke-z-limono-in-jagodami",
    image_path: null,
  },
];

describe("recipe cover filename mapping", () => {
  it("normalizes numbering, Slovenian characters, punctuation, and emoji", () => {
    expect(normalizeRecipeCoverName("01_Čokoladni žepki 🍫.png")).toBe(
      "cokoladni-zepki",
    );
  });

  it("maps an exact normalized title with high confidence", () => {
    expect(
      mapCoverFilename("01_borovnicevi_mafini.png", recipes),
    ).toMatchObject({
      confidence: "exact-title",
      recipe: { title: "Borovničevi mafini" },
    });
  });

  it("does not guess an unmatched image", () => {
    expect(mapCoverFilename("unknown-cake.png", recipes)).toEqual({
      confidence: "unmatched",
      recipe: null,
    });
  });
});
