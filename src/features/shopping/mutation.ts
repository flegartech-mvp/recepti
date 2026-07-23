export const DEFAULT_SHOPPING_ERROR =
  "The shopping list could not be updated. No local change was kept.";

export const SHOPPING_NETWORK_ERROR =
  "The shopping list could not reach the server. Check your connection and try again; no local change was kept.";

type ShoppingMutationResult = {
  ok: boolean;
  message?: string;
};

export type ShoppingMutationOutcome =
  { ok: true } | { ok: false; message: string };

export async function runShoppingMutation(
  action: () => Promise<ShoppingMutationResult>,
): Promise<ShoppingMutationOutcome> {
  try {
    const result = await action();
    if (!result.ok) {
      return {
        ok: false,
        message: result.message ?? DEFAULT_SHOPPING_ERROR,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: SHOPPING_NETWORK_ERROR };
  }
}
