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
  requireOwner: vi.fn(async () => ({
    id: "00000000-0000-4000-8000-000000000001",
  })),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => {
    throw new Error("The test import path must not contact Supabase.");
  }),
}));

import { POST } from "@/app/api/import/family-notebook/route";

function request(action: "preview" | "import") {
  return new NextRequest("http://localhost/api/import/family-notebook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

describe("owner-only family notebook import API", () => {
  beforeEach(() => {
    mocks.authorizationStatus = "owner";
    mocks.revalidatePath.mockReset();
  });

  it("previews exactly 15 missing bundled recipes", async () => {
    const response = await POST(request("preview"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      preview: {
        totalRecipes: 15,
        importableRecipes: 15,
        skippedRecipes: 0,
        allImported: false,
      },
    });
  });

  it("imports through the merge-only test path", async () => {
    const response = await POST(request("import"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      imported: true,
      result: { mode: "merge", recipes_imported: 15 },
    });
  });

  it("fails closed before reading a request for a non-owner", async () => {
    mocks.authorizationStatus = "guest";
    const response = await POST(request("preview"));
    expect(response.status).toBe(401);
  });
});
