"use client";

import type { Dispatch, SetStateAction } from "react";
import { LoaderCircle } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { IngredientAutocomplete } from "@/features/ingredients/components/ingredient-autocomplete";
import { STORAGE_LOCATIONS, UNITS } from "@/lib/constants";
import type { IngredientSearchResult } from "@/lib/domain/ingredient-search";
import type { Ingredient, StorageLocation } from "@/types/domain";

import { isPantryUuid, type PantryFormState } from "./pantry-form-state";

export function PantryItemDialog({
  open,
  onOpenChange,
  form,
  setForm,
  catalog,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PantryFormState;
  setForm: Dispatch<SetStateAction<PantryFormState>>;
  catalog: Ingredient[];
  pending: boolean;
  onSave: () => void;
}) {
  const { t } = useI18n();
  const chooseIngredient = (result: IngredientSearchResult) =>
    setForm((current) => ({
      ...current,
      ingredientId: isPantryUuid(result.ingredient.id)
        ? result.ingredient.id
        : "",
      ingredientName: result.displayName,
      unit: result.ingredient.defaultUnit ?? current.unit,
    }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t(form.id ? "Edit pantry item" : "Add pantry item")}
          </DialogTitle>
          <DialogDescription>
            {t("Quantity comparisons are only made across compatible units.")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pantry-name">{t("Ingredient name")}</Label>
            <IngredientAutocomplete
              id="pantry-name"
              value={form.ingredientName}
              catalog={catalog}
              ariaLabel={t("Ingredient name")}
              placeholder={t("Search ingredients or add your own")}
              disabled={pending}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  ingredientId: "",
                  ingredientName: value,
                }))
              }
              onSelect={chooseIngredient}
              onCustom={(value) =>
                setForm((current) => ({
                  ...current,
                  ingredientId: "",
                  ingredientName: value,
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pantry-quantity">{t("Quantity")}</Label>
            <Input
              id="pantry-quantity"
              inputMode="decimal"
              value={form.quantity}
              onChange={(event) =>
                setForm({ ...form, quantity: event.target.value })
              }
              placeholder="500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pantry-unit">{t("Unit")}</Label>
            <Input
              id="pantry-unit"
              list="pantry-units"
              value={form.unit}
              onChange={(event) =>
                setForm({ ...form, unit: event.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Storage location")}</Label>
            <Select
              value={form.storageLocation}
              onValueChange={(value: StorageLocation) =>
                setForm({ ...form, storageLocation: value })
              }
            >
              <SelectTrigger
                className="w-full"
                aria-label={t("Storage location")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STORAGE_LOCATIONS.map((location) => (
                  <SelectItem key={location.value} value={location.value}>
                    {t(location.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pantry-expiry">{t("Expiration date")}</Label>
            <Input
              id="pantry-expiry"
              type="date"
              value={form.expirationDate}
              onChange={(event) =>
                setForm({ ...form, expirationDate: event.target.value })
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pantry-notes">{t("Note")}</Label>
            <Textarea
              id="pantry-notes"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium sm:col-span-2">
            <Checkbox
              checked={form.lowStock}
              onCheckedChange={(checked) =>
                setForm({ ...form, lowStock: checked === true })
              }
            />
            {t("Mark as low stock")}
          </label>
        </div>
        <datalist id="pantry-units">
          {UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={onSave}
            disabled={pending || !form.ingredientName.trim()}
          >
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            {t("Save item")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
