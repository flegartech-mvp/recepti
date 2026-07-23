import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SHOPPING_ERROR,
  runShoppingMutation,
  SHOPPING_NETWORK_ERROR,
} from "@/features/shopping/mutation";

describe("shopping mutation reliability", () => {
  it("allows confirmed successful mutations", async () => {
    const action = vi.fn().mockResolvedValue({ ok: true });

    await expect(runShoppingMutation(action)).resolves.toEqual({ ok: true });
    expect(action).toHaveBeenCalledOnce();
  });

  it("preserves a returned action error for the UI", async () => {
    await expect(
      runShoppingMutation(async () => ({
        ok: false,
        message: "Purchased items were not moved. The list is unchanged.",
      })),
    ).resolves.toEqual({
      ok: false,
      message: "Purchased items were not moved. The list is unchanged.",
    });
  });

  it("uses an unchanged-state fallback when an action has no message", async () => {
    await expect(
      runShoppingMutation(async () => ({ ok: false })),
    ).resolves.toEqual({ ok: false, message: DEFAULT_SHOPPING_ERROR });
  });

  it("turns a rejected transport into an explicit offline-safe failure", async () => {
    await expect(
      runShoppingMutation(async () => {
        throw new TypeError("Failed to fetch");
      }),
    ).resolves.toEqual({ ok: false, message: SHOPPING_NETWORK_ERROR });
  });
});
