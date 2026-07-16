/** @vitest-environment jsdom */

import { createElement } from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ShoppingListManager } from "@/features/shopping/components/shopping-list-manager";
import type { ShoppingListItem } from "@/types/domain";

const mocks = vi.hoisted(() => ({
  clearCompleted: vi.fn(),
  deleteItem: vi.fn(),
  movePurchased: vi.fn(),
  refresh: vi.fn(),
  saveItem: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toggleItem: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
  },
}));

vi.mock("@/features/shopping/actions", () => ({
  clearCompletedShoppingAction: mocks.clearCompleted,
  deleteShoppingItemAction: mocks.deleteItem,
  movePurchasedToPantryAction: mocks.movePurchased,
  saveShoppingItemAction: mocks.saveItem,
  toggleShoppingItemAction: mocks.toggleItem,
}));

const item = (
  id: string,
  ingredientName: string,
  isCompleted = false,
): ShoppingListItem => ({
  id,
  ingredientId: null,
  ingredientName,
  quantity: 1,
  unit: "piece",
  recipeId: null,
  recipeTitle: null,
  isCompleted,
  completedAt: isCompleted ? "2026-07-15T12:00:00.000Z" : null,
  createdAt: "2026-07-15T12:00:00.000Z",
});

const renderManager = (initialItems: ShoppingListItem[]) =>
  render(
    createElement(ShoppingListManager, {
      initialItems,
      catalog: [],
    }),
  );

describe("ShoppingListManager confirmed-state mutations", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.clearCompleted.mockResolvedValue({ ok: true });
    mocks.deleteItem.mockResolvedValue({ ok: true });
    mocks.movePurchased.mockResolvedValue({ ok: true, data: { count: 1 } });
    mocks.saveItem.mockResolvedValue({ ok: true, data: { id: "new-item" } });
    mocks.toggleItem.mockResolvedValue({ ok: true });
  });

  it("does not visually toggle an item when the action returns an error", async () => {
    mocks.toggleItem.mockResolvedValue({
      ok: false,
      message: "The shopping item could not be updated.",
    });
    renderManager([item("milk", "Milk")]);

    const checkbox = screen.getByRole("checkbox", {
      name: "Mark Milk purchased",
    });
    fireEvent.click(checkbox);

    await screen.findByText("Shopping list unchanged");
    expect(checkbox.getAttribute("aria-checked")).toBe("false");
    expect(mocks.toastError).toHaveBeenCalledWith(
      "The shopping item could not be updated.",
    );
  });

  it("keeps a row visible when delete rejects at the network boundary", async () => {
    mocks.deleteItem.mockRejectedValue(new TypeError("Failed to fetch"));
    renderManager([item("milk", "Milk")]);

    fireEvent.click(screen.getByRole("button", { name: "Delete Milk" }));

    await screen.findByText("Shopping list unchanged");
    expect(screen.getByText(/Milk/)).toBeTruthy();
    expect(mocks.toastError).toHaveBeenCalledWith(
      expect.stringContaining("Check your connection"),
    );
  });

  it("moves only purchased rows after the server confirms the transaction", async () => {
    renderManager([item("bread", "Bread"), item("milk", "Milk", true)]);

    fireEvent.click(
      screen.getByRole("button", { name: "Move purchased to pantry" }),
    );

    await waitFor(() => expect(screen.queryByText(/Milk/)).toBeNull());
    expect(screen.getByText(/Bread/)).toBeTruthy();
    expect(mocks.movePurchased).toHaveBeenCalledWith(["milk"]);
  });
});
