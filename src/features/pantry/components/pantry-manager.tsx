"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Plus, Search, Zap } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adjustPantryQuantityAction,
  deletePantryItemAction,
  depletePantryItemAction,
  savePantryBatchAction,
  savePantryItemAction,
} from "@/features/pantry/actions";
import { STORAGE_LOCATIONS } from "@/lib/constants";
import {
  localizedIngredientName,
  normalizeIngredientSearch,
} from "@/lib/domain/ingredient-search";
import type { Ingredient, PantryItem } from "@/types/domain";

import { PantryFastEntrySheet } from "./pantry-fast-entry-sheet";
import {
  emptyPantryForm,
  pantryFormFromItem,
  pantryFormToInput,
  type PantryFormState,
} from "./pantry-form-state";
import { PantryItemCard } from "./pantry-item-card";
import { PantryItemDialog } from "./pantry-item-dialog";

export function PantryManager({
  items,
  catalog,
  initialOpen = false,
}: {
  items: PantryItem[];
  catalog: Ingredient[];
  initialOpen?: boolean;
}) {
  const router = useRouter();
  const { locale, t, formatNumber, plural } = useI18n();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("name");
  const [dialogOpen, setDialogOpen] = useState(initialOpen);
  const [fastOpen, setFastOpen] = useState(false);
  const [form, setForm] = useState<PantryFormState>(emptyPantryForm);
  const [fastRows, setFastRows] = useState<PantryFormState[]>(
    Array.from({ length: 5 }, emptyPantryForm),
  );
  const localizedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        ingredient: {
          ...item.ingredient,
          displayName: localizedIngredientName(item.ingredient, locale),
        },
      })),
    [items, locale],
  );
  const filtered = useMemo(() => {
    const normalized = normalizeIngredientSearch(query);
    const result = localizedItems.filter((item) =>
      [
        item.ingredient.displayName,
        item.ingredient.canonicalName,
        item.ingredient.normalizedName,
        ...item.ingredient.aliases,
        item.notes ?? "",
      ]
        .map(normalizeIngredientSearch)
        .some((value) => !normalized || value.includes(normalized)),
    );
    result.sort((a, b) => {
      if (sort === "recent") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "expiration")
        return (a.expirationDate ?? "9999").localeCompare(
          b.expirationDate ?? "9999",
        );
      if (sort === "location")
        return (
          a.storageLocation.localeCompare(b.storageLocation) ||
          a.ingredient.displayName.localeCompare(b.ingredient.displayName)
        );
      return a.ingredient.displayName.localeCompare(b.ingredient.displayName);
    });
    return result;
  }, [localizedItems, query, sort]);
  const groups = STORAGE_LOCATIONS.map((location) => ({
    ...location,
    items: filtered.filter((item) => item.storageLocation === location.value),
  })).filter((group) => group.items.length > 0);

  const execute = (
    action: () => Promise<{ ok: boolean; message?: string }>,
    success: string,
    close = false,
  ) =>
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t(result.message ?? "The pantry could not be updated."));
        return;
      }
      toast.success(t(success));
      if (close) {
        setDialogOpen(false);
        setForm(emptyPantryForm());
      }
      router.refresh();
    });

  const saveFastRows = () => {
    const rows = fastRows
      .filter((row) => row.ingredientName.trim())
      .map(pantryFormToInput);
    startTransition(async () => {
      const result = await savePantryBatchAction(rows);
      if (!result.ok) {
        toast.error(t(result.message));
        return;
      }
      toast.success(
        plural(result.data.count, {
          one: "{count} pantry item saved",
          two: "{count} pantry items saved-two",
          few: "{count} pantry items saved-few",
          other: "{count} pantry items saved",
        }),
      );
      setFastOpen(false);
      setFastRows(Array.from({ length: 5 }, emptyPantryForm));
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 pl-10"
            placeholder={t("Search the pantry")}
            aria-label={t("Search pantry")}
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger
            className="h-11 w-full sm:w-48"
            aria-label={t("Sort pantry")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">{t("Name")}</SelectItem>
            <SelectItem value="recent">{t("Recently added")}</SelectItem>
            <SelectItem value="expiration">{t("Expiration date")}</SelectItem>
            <SelectItem value="location">{t("Storage location")}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setFastOpen(true)}
        >
          <Zap className="size-4" />
          {t("Fast entry")}
        </Button>
        <Button
          className="h-11"
          onClick={() => {
            setForm(emptyPantryForm());
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          {t("Add item")}
        </Button>
      </div>

      {groups.length === 0 && (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center">
          <div className="max-w-md space-y-4">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <PackagePlus className="size-7" aria-hidden="true" />
            </span>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                {items.length === 0
                  ? t("Add what is already at home")
                  : t("No pantry items match")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {items.length === 0
                  ? t(
                      "Start with one ingredient or use fast entry after your next grocery trip.",
                    )
                  : t(
                      "Nothing matches “{query}”. Clear the search to see the full pantry.",
                      { query: query.trim() },
                    )}
              </p>
            </div>
            <Button
              onClick={() => {
                if (items.length > 0) setQuery("");
                else {
                  setForm(emptyPantryForm());
                  setDialogOpen(true);
                }
              }}
            >
              {t(items.length === 0 ? "Add first item" : "Clear search")}
            </Button>
          </div>
        </div>
      )}

      {groups.map((group) => (
        <section
          key={group.value}
          className="space-y-3"
          aria-labelledby={`pantry-${group.value}`}
        >
          <div className="flex items-center gap-3">
            <h2 id={`pantry-${group.value}`} className="text-lg font-semibold">
              {t(group.label)}
            </h2>
            <Badge variant="secondary">
              {formatNumber(group.items.length)}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <PantryItemCard
                key={item.id}
                item={item}
                pending={pending}
                onEdit={() => {
                  setForm(pantryFormFromItem(item));
                  setDialogOpen(true);
                }}
                onAdjust={(delta) =>
                  execute(
                    () => adjustPantryQuantityAction(item.id, delta, item.unit),
                    "Quantity updated",
                  )
                }
                onDeplete={() =>
                  execute(
                    () => depletePantryItemAction(item.id),
                    "Item marked depleted",
                  )
                }
                onDelete={() =>
                  execute(
                    () => deletePantryItemAction(item.id),
                    "Pantry item deleted",
                  )
                }
              />
            ))}
          </div>
        </section>
      ))}

      <PantryItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        catalog={catalog}
        pending={pending}
        onSave={() =>
          execute(
            () => savePantryItemAction(pantryFormToInput(form)),
            "Pantry item saved",
            true,
          )
        }
      />
      <PantryFastEntrySheet
        open={fastOpen}
        onOpenChange={setFastOpen}
        rows={fastRows}
        setRows={setFastRows}
        catalog={catalog}
        pending={pending}
        onSave={saveFastRows}
      />
    </div>
  );
}
