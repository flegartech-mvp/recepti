import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizationStatus: "owner",
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/authorization", () => ({
  getAuthorizationState: vi.fn(async () => ({
    status: mocks.authorizationStatus,
    user:
      mocks.authorizationStatus === "signed-out"
        ? null
        : { id: "00000000-0000-4000-8000-000000000001" },
    configured: true,
  })),
  isTestAuthenticationEnabled: () => true,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => {
    throw new Error("The test import path must not contact Supabase.");
  }),
}));

import { POST } from "@/app/api/import/route";

const timestamp = "2026-07-23T12:00:00.000Z";
const settings = {
  theme: "pink-dark",
  defaultServings: 2,
  measurementPreference: "original",
  stapleIngredientIds: [],
  additionalStapleNames: [],
  reduceMotion: false,
  enabledRetailers: ["spar-si", "hofer-si", "lidl-si"],
  preferredRetailer: null,
  allowLoyaltyPrices: false,
  allowSplitBasket: false,
  preferPromotions: false,
  preferredBrands: [],
  excludedBrands: [],
};
const emptyBackup = {
  schemaVersion: 2,
  product: "Nana's Recipes",
  exportedAt: timestamp,
  ingredients: [],
  tags: [],
  recipes: [],
  pantryItems: [],
  shoppingListItems: [],
  cookingHistory: [],
  settings,
};

function request(body: unknown) {
  return new NextRequest("http://localhost/api/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("owner-only cookbook import API", () => {
  beforeEach(() => {
    mocks.authorizationStatus = "owner";
    mocks.revalidatePath.mockReset();
  });

  it("previews and imports a valid backup through the atomic merge path", async () => {
    const preview = await POST(
      request({ action: "preview", payload: emptyBackup }),
    );
    expect(preview.status).toBe(200);
    await expect(preview.json()).resolves.toMatchObject({
      preview: { schemaVersion: 2, recipes: 0 },
    });

    const imported = await POST(
      request({
        action: "import",
        payload: emptyBackup,
        confirmation: "IMPORT NANA'S RECIPES",
      }),
    );
    expect(imported.status).toBe(200);
    await expect(imported.json()).resolves.toMatchObject({
      imported: true,
      result: { mode: "merge", recipes_imported: 0 },
    });
  });

  it("rejects malformed and unsupported backups before a write", async () => {
    const malformed = await POST(
      request({ action: "preview", payload: { schemaVersion: 2 } }),
    );
    expect(malformed.status).toBe(400);

    const unsupported = await POST(
      request({
        action: "preview",
        payload: { ...emptyBackup, schemaVersion: 99 },
      }),
    );
    expect(unsupported.status).toBe(400);
  });

  it("rejects an oversized request before parsing it", async () => {
    const oversized = new NextRequest("http://localhost/api/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": String(12 * 1024 * 1024),
      },
      body: "{}",
    });

    const response = await POST(oversized);
    expect(response.status).toBe(413);
  });

  it("fails closed before parsing backup data for a non-owner", async () => {
    mocks.authorizationStatus = "guest";
    const response = await POST(
      request({ action: "preview", payload: emptyBackup }),
    );
    expect(response.status).toBe(401);
  });
});
