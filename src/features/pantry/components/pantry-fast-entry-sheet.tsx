"use client";

import type { Dispatch, SetStateAction } from "react";
import { PackagePlus } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { IngredientAutocomplete } from "@/features/ingredients/components/ingredient-autocomplete";
import type { Ingredient } from "@/types/domain";

import { isPantryUuid, type PantryFormState } from "./pantry-form-state";

export function PantryFastEntrySheet({
  open,
  onOpenChange,
  rows,
  setRows,
  catalog,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: PantryFormState[];
  setRows: Dispatch<SetStateAction<PantryFormState[]>>;
  catalog: Ingredient[];
  pending: boolean;
  onSave: () => void;
}) {
  const { t, formatNumber } = useI18n();
  const updateRow = (index: number, patch: Partial<PantryFormState>) =>
    setRows((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("Fast grocery entry")}</SheetTitle>
          <SheetDescription>
            {t(
              "Add several items after shopping, then save them together in one transaction.",
            )}
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 py-6">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_5.5rem_5.5rem]"
            >
              <IngredientAutocomplete
                id={`fast-ingredient-${index}`}
                className="col-span-2 sm:col-span-1"
                value={row.ingredientName}
                catalog={catalog}
                disabled={pending}
                onValueChange={(value) =>
                  updateRow(index, { ingredientId: "", ingredientName: value })
                }
                onSelect={(result) =>
                  updateRow(index, {
                    ingredientId: isPantryUuid(result.ingredient.id)
                      ? result.ingredient.id
                      : "",
                    ingredientName: result.displayName,
                    unit: result.ingredient.defaultUnit ?? row.unit,
                  })
                }
                onCustom={(value) =>
                  updateRow(index, { ingredientId: "", ingredientName: value })
                }
                placeholder={t("Ingredient {number}", {
                  number: formatNumber(index + 1),
                })}
                ariaLabel={t("Fast ingredient {number}", {
                  number: formatNumber(index + 1),
                })}
              />
              <Input
                inputMode="decimal"
                value={row.quantity}
                onChange={(event) =>
                  updateRow(index, { quantity: event.target.value })
                }
                placeholder={t("Qty")}
                aria-label={t("Quantity {number}", {
                  number: formatNumber(index + 1),
                })}
              />
              <Input
                value={row.unit}
                onChange={(event) =>
                  updateRow(index, { unit: event.target.value })
                }
                placeholder={t("Unit")}
                aria-label={t("Unit {number}", {
                  number: formatNumber(index + 1),
                })}
              />
            </div>
          ))}
        </div>
        <SheetFooter className="px-4">
          <Button
            onClick={onSave}
            disabled={pending || !rows.some((row) => row.ingredientName.trim())}
          >
            <PackagePlus className="size-4" />
            {t("Save groceries")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
