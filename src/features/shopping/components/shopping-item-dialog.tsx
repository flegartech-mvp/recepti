"use client";

import { LoaderCircle } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IngredientAutocomplete } from "@/features/ingredients/components/ingredient-autocomplete";
import { UNITS } from "@/lib/constants";
import type { IngredientSearchResult } from "@/lib/domain/ingredient-search";
import type { Ingredient } from "@/types/domain";

export function ShoppingItemDialog({
  open,
  onOpenChange,
  name,
  quantity,
  unit,
  catalog,
  pending,
  onNameChange,
  onQuantityChange,
  onUnitChange,
  onIngredientSelect,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  quantity: string;
  unit: string;
  catalog: Ingredient[];
  pending: boolean;
  onNameChange: (value: string) => void;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onIngredientSelect: (result: IngredientSearchResult) => void;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Add shopping item")}</DialogTitle>
          <DialogDescription>
            {t(
              "Existing duplicates are merged when their units are compatible.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="shopping-name">{t("Item name")}</Label>
            <IngredientAutocomplete
              id="shopping-name"
              value={name}
              catalog={catalog}
              disabled={pending}
              ariaLabel={t("Item name")}
              placeholder={t("Search ingredients or retailer products")}
              onValueChange={onNameChange}
              onSelect={onIngredientSelect}
              onCustom={onNameChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopping-quantity">{t("Quantity")}</Label>
            <Input
              id="shopping-quantity"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => onQuantityChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopping-unit">{t("Unit")}</Label>
            <Input
              id="shopping-unit"
              list="shopping-units"
              value={unit}
              onChange={(event) => onUnitChange(event.target.value)}
            />
          </div>
        </div>
        <datalist id="shopping-units">
          {UNITS.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button onClick={onAdd} disabled={pending || !name.trim()}>
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            {t("Add item")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
