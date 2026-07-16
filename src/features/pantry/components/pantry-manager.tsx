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
    const normalized = query.trim().toLocaleLowerCase("en-US");
    const result = items.filter(
      (item) =>
        !normalized ||
        item.ingredient.displayName
          .toLocaleLowerCase("en-US")
          .includes(normalized) ||
        item.notes?.toLocaleLowerCase("en-US").includes(normalized),
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
  }, [items, query, sort]);

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
        toast.error(result.message ?? "The pantry could not be updated.");
        return;
      }
      toast.success(success);
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
            placeholder="Search the pantry"
            aria-label="Search pantry"
          />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger
            className="h-11 w-full sm:w-48"
            aria-label="Sort pantry"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="expiration">Expiration date</SelectItem>
            <SelectItem value="location">Storage location</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setFastOpen(true)}
        >
          <Zap className="size-4" />
          Fast entry
        </Button>
        <Button
          className="h-11"
          onClick={() => {
            setForm(emptyForm());
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add item
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
                  ? "Add what is already at home"
                  : "No pantry items match"}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {items.length === 0
                  ? "Start with one ingredient or use fast entry after your next grocery trip."
                  : `Nothing matches “${query.trim()}”. Clear the search to see the full pantry.`}
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
              {items.length === 0 ? "Add first item" : "Clear search"}
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
              {group.label}
            </h2>
            <Badge variant="secondary">{group.items.length}</Badge>
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
              {form.id ? "Edit pantry item" : "Add pantry item"}
            </DialogTitle>
            <DialogDescription>
              Quantity comparisons are only made across compatible units.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Ingredient catalog</Label>
              <Select
                value={form.ingredientId || "custom"}
                onValueChange={chooseIngredient}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Ingredient catalog"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">New ingredient</SelectItem>
                  {catalog.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pantry-name">Ingredient name</Label>
              <Input
                id="pantry-name"
                value={form.ingredientName}
                onChange={(event) =>
                  setForm({ ...form, ingredientName: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pantry-quantity">Quantity</Label>
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
              <Label htmlFor="pantry-unit">Unit</Label>
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
              <Label>Storage location</Label>
              <Select
                value={form.storageLocation}
                onValueChange={(value: StorageLocation) =>
                  setForm({ ...form, storageLocation: value })
                }
              >
                <SelectTrigger className="w-full" aria-label="Storage location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_LOCATIONS.map((location) => (
                    <SelectItem key={location.value} value={location.value}>
                      {location.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pantry-expiry">Expiration date</Label>
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
              <Label htmlFor="pantry-notes">Note</Label>
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
              Mark as low stock
            </label>
          </div>
          <datalist id="pantry-units">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
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
              {pending && <LoaderCircle className="size-4 animate-spin" />}Save
              item
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
            <SheetTitle>Fast grocery entry</SheetTitle>
            <SheetDescription>
              Add several items after shopping, then save them together in one
              transaction.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 px-4 py-6">
            {fastRows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_5.5rem_5.5rem] gap-2 rounded-xl border border-border p-3"
              >
                <Input
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
                  placeholder={`Ingredient ${index + 1}`}
                  aria-label={`Fast ingredient ${index + 1}`}
                />
                <Input
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
                  placeholder="Qty"
                  aria-label={`Quantity ${index + 1}`}
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
                  placeholder="Unit"
                  aria-label={`Unit ${index + 1}`}
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
                    toast.error(result.message);
                    return;
                  }
                  toast.success(`${result.data.count} pantry items saved`);
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
              Save groceries
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
  const days = item.expirationDate
    ? differenceInCalendarDays(parseISO(item.expirationDate), new Date())
    : null;
  const expiry =
    days === null
      ? null
      : days < 0
        ? { label: "Expired", danger: true }
        : days === 0
          ? { label: "Expires today", danger: true }
          : days <= 3
            ? { label: `Expires in ${days} days`, danger: false }
            : { label: item.expirationDate!, danger: false };
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{item.ingredient.displayName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.quantity ?? "Unknown"} {item.unit ?? ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          aria-label={`Edit ${item.ingredient.displayName}`}
        >
          <Edit3 className="size-4" />
        </Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.lowStock && (
          <Badge variant="outline" className="border-peach">
            Low stock
          </Badge>
        )}
        {expiry && (
          <Badge variant={expiry.danger ? "destructive" : "secondary"}>
            {expiry.label}
          </Badge>
        )}
      </div>
      {item.notes && (
        <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p>
      )}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-1">
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending || item.quantity === null}
            onClick={() => onAdjust(-1)}
            aria-label={`Decrease ${item.ingredient.displayName}`}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending || item.quantity === null}
            onClick={() => onAdjust(1)}
            aria-label={`Increase ${item.ingredient.displayName}`}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onDeplete}>
            <Check className="size-4" />
            Depleted
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${item.ingredient.displayName}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete pantry item?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes {item.ingredient.displayName} from the pantry,
                  not the ingredient catalog.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  );
}
