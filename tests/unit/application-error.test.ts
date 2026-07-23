import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApplicationError,
  classifySupabaseError,
} from "@/lib/errors/application-error";
import { DEFAULT_SETTINGS, parseUserSettingsRow } from "@/lib/data/settings";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Supabase error classification", () => {
  it.each([
    [{ code: "42501" }, "DATA_ACCESS_DENIED"],
    [{ status: 403 }, "DATA_ACCESS_DENIED"],
    [{ code: "42P01" }, "MIGRATION_MISSING"],
    [{ code: "PGRST202" }, "MIGRATION_MISSING"],
    [{ code: "08006" }, "DATABASE_UNAVAILABLE"],
  ] as const)("classifies %j as %s", (error, expected) => {
    expect(classifySupabaseError(error)).toBe(expected);
  });
});

describe("persisted settings", () => {
  it("uses defaults only when no row exists", () => {
    expect(parseUserSettingsRow(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("accepts a complete valid row", () => {
    expect(
      parseUserSettingsRow({
        theme: "dark",
        default_servings: 4,
        measurement_preference: "metric",
        staple_ingredient_ids: [],
        additional_staple_names: [],
        reduce_motion: true,
        enabled_retailers: ["spar-si"],
        preferred_retailer: "spar-si",
        allow_loyalty_prices: false,
        allow_split_basket: false,
        prefer_promotions: false,
        preferred_brands: [],
        excluded_brands: [],
      }),
    ).toMatchObject({
      theme: "dark",
      defaultServings: 4,
      preferredRetailer: "spar-si",
    });
  });

  it("throws for corrupt rows instead of replacing them with defaults", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      parseUserSettingsRow({
        theme: "not-a-theme",
        default_servings: "broken",
      });
      throw new Error("Expected corrupt settings to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe("DATA_CORRUPT");
    }
  });
});
