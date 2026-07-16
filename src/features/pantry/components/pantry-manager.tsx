"use client";

import { useMemo, useState, useTransition } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import {
  Check,
  Edit3,
  LoaderCircle,
  Minus,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  adjustPantryQuantityAction,
  deletePantryItemAction,
  depletePantryItemAction,
  savePantryBatchAction,
  savePantryItemAction,
} from "@/features/pantry/actions";
import { STORAGE_LOCATIONS, UNITS } from "@/lib/constants";
import type { PantryItemInput } from "@/lib/validation";
import type { Ingredient, PantryItem, StorageLocation } from "@/types/domain";

const isUuid = (value: string | undefined) =>
  Boolean(value && /^[0-9a-f-]{36}$/i.test(value));

interface FormState {
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

const emptyForm = (): FormState => ({
  ingredientId: "",
  ingredientName: "",
  quantity: "",
  unit: "",
  storageLocation: "pantry",
  expirationDate: "",
  notes: "",
  lowStock: false,
});

function fromItem(item: PantryItem): FormState {
  return {
    id: isUuid(item.id) ? item.id : undefined,
    ingredientId: isUuid(item.ingredientId) ? item.ingredientId : "",
    ingredientName: item.ingredient.displayName,
    quantity: item.quantity === null ? "" : String(item.quantity),
    unit: item.unit ?? "",
    storageLocation: item.storageLocation,
    expirationDate: item.expirationDate ?? "",
    notes: item.notes ?? "",
    lowStock: item.lowStock,
  };
}

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
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fastRows, setFastRows] = useState<FormState[]>(
    Array.from({ length: 5 }, emptyForm),
  );

  const filtered = useMemo(() => {
    const localeName = locale === "sl" ? "sl-SI" : "en-GB";
    const normalized = query.trim().toLocaleLowerCase(localeName);
    const result = items.filter(
      (item) =>
        !normalized ||
        item.ingredient.displayName
          .toLocaleLowerCase(localeName)
          .includes(normalized) ||
        item.notes?.toLocaleLowerCase(localeName).includes(normalized),
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
  }, [items, locale, query, sort]);

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
        setForm(emptyForm());
      }
      router.refresh();
    });

  const toInput = (value: FormState): PantryItemInput => ({
    id: isUuid(value.id) ? value.id : undefined,
    ingredientId: isUuid(value.ingredientId) ? value.ingredientId : undefined,
    ingredientName: value.ingredientName,
    quantity: value.quantity,
    unit: value.unit,
    expirationDate: value.expirationDate,
    storageLocation: value.storageLocation,
    notes: value.notes,
    lowStock: value.lowStock,
    isDepleted: false,
  });

  const chooseIngredient = (id: string) => {
    if (id === "custom") {
      setForm((current) => ({
        ...current,
        ingredientId: "",
        ingredientName: "",
      }));
      return;
    }
    const ingredient = catalog.find((item) => item.id === id);
    if (ingredient)
      setForm((current) => ({
        ...current,
        ingredientId: ingredient.id,
        ingredientName: ingredient.displayName,
        unit: ingredient.defaultUnit ?? current.unit,
      }));
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
            setForm(emptyForm());
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
                if (items.length > 0) {
                  setQuery("");
                  return;
                }
                setForm(emptyForm());
                setDialogOpen(true);
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
                  setForm(fromItem(item));
                  setDialogOpen(true);
                }}
                onAdjust={(delta) =>
                  execute(
                    () => adjustPantryQuantityAction(item.id, delta),
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
              <Label>{t("Ingredient catalog")}</Label>
              <Select
                value={form.ingredientId || "custom"}
                onValueChange={chooseIngredient}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label={t("Ingredient catalog")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">{t("New ingredient")}</SelectItem>
                  {catalog.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pantry-name">{t("Ingredient name")}</Label>
              <Input
                id="pantry-name"
                value={form.ingredientName}
                onChange={(event) =>
                  setForm({ ...form, ingredientName: event.target.value })
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={() =>
                execute(
                  () => savePantryItemAction(toInput(form)),
                  "Pantry item saved",
                  true,
                )
              }
              disabled={pending || !form.ingredientName.trim()}
            >
              {pending && <LoaderCircle className="size-4 animate-spin" />}
              {t("Save item")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={fastOpen} onOpenChange={setFastOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-xl"
        >
          <SheetHeader>
            <SheetTitle>{t("Fast grocery entry")}</SheetTitle>
            <SheetDescription>
              {t(
                "Add several items after shopping, then save them together in one transaction.",
              )}
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 py-6">
            {fastRows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_5.5rem_5.5rem]"
              >
                <Input
                  className="col-span-2 sm:col-span-1"
                  value={row.ingredientName}
                  onChange={(event) =>
                    setFastRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, ingredientName: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={t("Ingredient {number}", {
                    number: formatNumber(index + 1),
                  })}
                  aria-label={t("Fast ingredient {number}", {
                    number: formatNumber(index + 1),
                  })}
                />
                <Input
                  inputMode="decimal"
                  value={row.quantity}
                  onChange={(event) =>
                    setFastRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, quantity: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder={t("Qty")}
                  aria-label={t("Quantity {number}", {
                    number: formatNumber(index + 1),
                  })}
                />
                <Input
                  value={row.unit}
                  onChange={(event) =>
                    setFastRows((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, unit: event.target.value }
                          : item,
                      ),
                    )
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
              onClick={() => {
                const rows = fastRows
                  .filter((row) => row.ingredientName.trim())
                  .map(toInput);
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
                  setFastRows(Array.from({ length: 5 }, emptyForm));
                  router.refresh();
                });
              }}
              disabled={
                pending || !fastRows.some((row) => row.ingredientName.trim())
              }
            >
              <PackagePlus className="size-4" />
              {t("Save groceries")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PantryItemCard({
  item,
  pending,
  onEdit,
  onAdjust,
  onDeplete,
  onDelete,
}: {
  item: PantryItem;
  pending: boolean;
  onEdit: () => void;
  onAdjust: (delta: number) => void;
  onDeplete: () => void;
  onDelete: () => void;
}) {
  const { t, formatDate, formatNumber, plural } = useI18n();
  const days = item.expirationDate
    ? differenceInCalendarDays(parseISO(item.expirationDate), new Date())
    : null;
  const expiry =
    days === null
      ? null
      : days < 0
        ? { label: t("Expired"), danger: true }
        : days === 0
          ? { label: t("Expires today"), danger: true }
          : days <= 3
            ? {
                label: plural(days, {
                  one: "Expires in {count} day",
                  two: "Expires in {count} days-two",
                  few: "Expires in {count} days-few",
                  other: "Expires in {count} days",
                }),
                danger: false,
              }
            : { label: formatDate(item.expirationDate!), danger: false };
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold [overflow-wrap:anywhere]">
            {item.ingredient.displayName}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.quantity === null
              ? t("Unknown")
              : formatNumber(item.quantity)}{" "}
            {item.unit ?? ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label={t("Edit {name}", { name: item.ingredient.displayName })}
        >
          <Edit3 className="size-4" />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.lowStock && (
          <Badge variant="outline" className="border-notice">
            {t("Low stock")}
          </Badge>
        )}
        {expiry && (
          <Badge variant={expiry.danger ? "destructive" : "secondary"}>
            {expiry.label}
          </Badge>
        )}
      </div>
      {item.notes && (
        <p className="mt-3 text-sm text-muted-foreground [overflow-wrap:anywhere]">
          {item.notes}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending || item.quantity === null}
            onClick={() => onAdjust(-1)}
            aria-label={t("Decrease {name}", {
              name: item.ingredient.displayName,
            })}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending || item.quantity === null}
            onClick={() => onAdjust(1)}
            aria-label={t("Increase {name}", {
              name: item.ingredient.displayName,
            })}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onDeplete}>
            <Check className="size-4" />
            {t("Depleted")}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={t("Delete {name}", {
                  name: item.ingredient.displayName,
                })}
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Delete pantry item?")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t(
                    "This removes {name} from the pantry, not the ingredient catalog.",
                    {
                      name: item.ingredient.displayName,
                    },
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>
                  {t("Delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  );
}
