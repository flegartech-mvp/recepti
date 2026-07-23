import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  requireOwner: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/authorization", () => ({
  isTestAuthenticationEnabled: () => false,
  requireOwner: mocks.requireOwner,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { updateRecipeAction } from "@/features/recipes/actions";

const RECIPE_ID = "22222222-2222-4222-8222-222222222222";
const draft = {
  title: "Mint pasta",
  status: "draft" as const,
  imagePath: "owner/new-cover.webp",
  ingredients: [],
  steps: [],
};

function recipeClient(options: {
  lookup: { data: { image_path: string | null } | null; error: unknown };
  update?: { data: unknown; error: unknown };
  cleanup?: { data: unknown; error: unknown };
  references?: Partial<
    Record<
      "recipes" | "recipe_steps" | "recipe_images",
      { count: number; error: unknown }
    >
  >;
}) {
  const maybeSingle = vi.fn().mockResolvedValue(options.lookup);
  const from = vi.fn((table: "recipes" | "recipe_steps" | "recipe_images") => ({
    select: vi.fn((_columns: string, countOptions?: { head?: boolean }) => ({
      eq: vi.fn(() =>
        countOptions?.head
          ? Promise.resolve(
              options.references?.[table] ?? { count: 0, error: null },
            )
          : { maybeSingle },
      ),
    })),
  }));
  const rpc = vi
    .fn()
    .mockResolvedValue(options.update ?? { data: null, error: null });
  const remove = vi
    .fn()
    .mockResolvedValue(options.cleanup ?? { data: null, error: null });
  const storageFrom = vi.fn(() => ({ remove }));
  const client = { from, rpc, storage: { from: storageFrom } };

  return { client, maybeSingle, remove, rpc };
}

describe("updateRecipeAction image cleanup", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.requireOwner.mockReset();
  });

  it("does not attempt an update when the previous cover lookup fails", async () => {
    const { client, remove, rpc } = recipeClient({
      lookup: { data: null, error: new Error("lookup failed") },
    });
    mocks.createClient.mockResolvedValue(client);

    const result = await updateRecipeAction(RECIPE_ID, draft);

    expect(result).toEqual({
      ok: false,
      message:
        "The current recipe could not be read, so no update was attempted.",
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports cleanup pending without rolling back a successful update", async () => {
    const { client, remove, rpc } = recipeClient({
      lookup: {
        data: { image_path: "owner/previous-cover.webp" },
        error: null,
      },
      cleanup: { data: null, error: new Error("storage unavailable") },
    });
    mocks.createClient.mockResolvedValue(client);

    const result = await updateRecipeAction(RECIPE_ID, draft);

    expect(result).toEqual({
      ok: true,
      data: { id: RECIPE_ID, storageCleanupPending: true },
    });
    expect(rpc).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith(["owner/previous-cover.webp"]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith(`/recipes/${RECIPE_ID}`);
  });

  it("does not delete storage when the cover path is unchanged", async () => {
    const { client, remove } = recipeClient({
      lookup: { data: { image_path: draft.imagePath }, error: null },
    });
    mocks.createClient.mockResolvedValue(client);

    const result = await updateRecipeAction(RECIPE_ID, draft);

    expect(result).toEqual({
      ok: true,
      data: { id: RECIPE_ID, storageCleanupPending: false },
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps a previous cover that another record still references", async () => {
    const { client, remove } = recipeClient({
      lookup: {
        data: { image_path: "owner/shared-cover.webp" },
        error: null,
      },
      references: {
        recipe_steps: { count: 1, error: null },
      },
    });
    mocks.createClient.mockResolvedValue(client);

    const result = await updateRecipeAction(RECIPE_ID, draft);

    expect(result).toEqual({
      ok: true,
      data: { id: RECIPE_ID, storageCleanupPending: false },
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("reports cleanup pending when surviving references cannot be checked", async () => {
    const { client, remove } = recipeClient({
      lookup: {
        data: { image_path: "owner/previous-cover.webp" },
        error: null,
      },
      references: {
        recipe_images: { count: 0, error: new Error("lookup unavailable") },
      },
    });
    mocks.createClient.mockResolvedValue(client);

    const result = await updateRecipeAction(RECIPE_ID, draft);

    expect(result).toEqual({
      ok: true,
      data: { id: RECIPE_ID, storageCleanupPending: true },
    });
    expect(remove).not.toHaveBeenCalled();
  });
});
