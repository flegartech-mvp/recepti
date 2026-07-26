import type { PantryItemInput } from "@/lib/validation";
import type { PantryItem, StorageLocation } from "@/types/domain";

export const isPantryUuid = (value: string | undefined) =>
  Boolean(value && /^[0-9a-f-]{36}$/i.test(value));

export interface PantryFormState {
  id?: string;
  ingredientId: string;
  ingredientName: string;
  quantity: string;
  unit: string;
  storageLocation: StorageLocation;
  expirationDate: string;
  notes: string;
  lowStock: boolean;
}

export const emptyPantryForm = (): PantryFormState => ({
  ingredientId: "",
  ingredientName: "",
  quantity: "",
  unit: "",
  storageLocation: "pantry",
  expirationDate: "",
  notes: "",
  lowStock: false,
});

export function pantryFormFromItem(item: PantryItem): PantryFormState {
  return {
    id: isPantryUuid(item.id) ? item.id : undefined,
    ingredientId: isPantryUuid(item.ingredientId) ? item.ingredientId : "",
    ingredientName: item.ingredient.displayName,
    quantity: item.quantity === null ? "" : String(item.quantity),
    unit: item.unit ?? "",
    storageLocation: item.storageLocation,
    expirationDate: item.expirationDate ?? "",
    notes: item.notes ?? "",
    lowStock: item.lowStock,
  };
}

export function pantryFormToInput(value: PantryFormState): PantryItemInput {
  return {
    id: isPantryUuid(value.id) ? value.id : undefined,
    ingredientId: isPantryUuid(value.ingredientId)
      ? value.ingredientId
      : undefined,
    ingredientName: value.ingredientName,
    quantity: value.quantity,
    unit: value.unit,
    expirationDate: value.expirationDate,
    storageLocation: value.storageLocation,
    notes: value.notes,
    lowStock: value.lowStock,
    isDepleted: false,
  };
}
