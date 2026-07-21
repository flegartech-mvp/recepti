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

import { deleteAllCookbookDataAction } from "@/features/settings/actions";

function settingsClient(options?: {
  rpcError?: unknown;
  storageError?: unknown;
}) {
  const rpc = vi.fn().mockResolvedValue({
    data: options?.rpcError
      ? null
      : { storage_paths_to_delete: ["owner/cover.webp"] },
    error: options?.rpcError ?? null,
  });
  const remove = vi.fn().mockResolvedValue({
    data: null,
    error: options?.storageError ?? null,
  });
  return {
    client: {
      rpc,
      storage: { from: vi.fn(() => ({ remove })) },
    },
    remove,
    rpc,
  };
}

describe("deleteAllCookbookDataAction", () => {
  beforeEach(() => {
    mocks.createClient.mockReset();
    mocks.revalidatePath.mockReset();
    mocks.requireOwner.mockReset();
  });

  it("does not contact the database without the exact confirmation", async () => {
    const result = await deleteAllCookbookDataAction("DELETE");

    expect(result).toEqual({
      ok: false,
      message: "Type DELETE NANA'S RECIPES exactly to confirm.",
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("reports database failure as no change", async () => {
    const { client, remove } = settingsClient({
      rpcError: new Error("database unavailable"),
    });
    mocks.createClient.mockResolvedValue(client);

    const result = await deleteAllCookbookDataAction("DELETE NANA'S RECIPES");

    expect(result).toEqual({
      ok: false,
      message: "Cookbook data could not be deleted. Nothing was changed.",
    });
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps database success truthful when Storage cleanup must be retried", async () => {
    const { client, remove } = settingsClient({
      storageError: new Error("storage unavailable"),
    });
    mocks.createClient.mockResolvedValue(client);

    const result = await deleteAllCookbookDataAction("DELETE NANA'S RECIPES");

    expect(result).toEqual({
      ok: true,
      data: { storageCleanupPending: true },
    });
    expect(remove).toHaveBeenCalledWith(["owner/cover.webp"]);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/settings");
  });
});
