"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  LoaderCircle,
  PackageCheck,
  Plus,
  ShoppingBasket,
  Smartphone,
  Trash2,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  clearCompletedShoppingAction,
  deleteShoppingItemAction,
  movePurchasedToPantryAction,
  saveShoppingItemAction,
  toggleShoppingItemAction,
} from "@/features/shopping/actions";
import { runShoppingMutation } from "@/features/shopping/mutation";
import { UNITS } from "@/lib/constants";
import type { ShoppingListItemInput } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { Ingredient, ShoppingListItem } from "@/types/domain";

const isUuid = (value: string | undefined | null) =>
  Boolean(value && /^[0-9a-f-]{36}$/i.test(value));

export function ShoppingListManager({
  initialItems,
  catalog,
}: {
  initialItems: ShoppingListItem[];
  catalog: Ingredient[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState(initialItems);
  const [previousInitialItems, setPreviousInitialItems] =
    useState(initialItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const [ingredientId, setIngredientId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [mutationError, setMutationError] = useState<string | null>(null);

  if (initialItems !== previousInitialItems) {
    setPreviousInitialItems(initialItems);
    setItems(initialItems);
  }

  const unchecked = useMemo(
    () => items.filter((item) => !item.isCompleted),
    [items],
  );
  const completed = useMemo(
    () => items.filter((item) => item.isCompleted),
    [items],
  );

  const execute = (
    action: () => Promise<{ ok: boolean; message?: string }>,
    success?: string,
    after?: () => void,
  ) =>
    startTransition(async () => {
      setMutationError(null);
      const result = await runShoppingMutation(action);
      if (!result.ok) {
        setMutationError(result.message);
        toast.error(result.message);
        router.refresh();
        return;
      }
      if (success) toast.success(success);
      after?.();
      router.refresh();
    });

  const chooseIngredient = (id: string) => {
    if (id === "custom") {
      setIngredientId("");
      setName("");
      return;
    }
    const ingredient = catalog.find((item) => item.id === id);
    if (!ingredient) return;
    setIngredientId(id);
    setName(ingredient.displayName);
    setUnit(ingredient.defaultUnit ?? "");
  };

  const addItem = () => {
    const input: ShoppingListItemInput = {
      ingredientId: isUuid(ingredientId) ? ingredientId : undefined,
      customName: name,
      quantity,
      unit,
      recipeId: null,
      isCompleted: false,
      completedAt: null,
      notes: null,
    };
    execute(
      () => saveShoppingItemAction(input),
      "Shopping item added",
      () => {
        setDialogOpen(false);
        setIngredientId("");
        setName("");
        setQuantity("");
        setUnit("");
      },
    );
  };

  const toggle = (item: ShoppingListItem) => {
    const complete = !item.isCompleted;
    execute(
      () => toggleShoppingItemAction(item.id, complete),
      undefined,
      () =>
        setItems((current) =>
          current.map((value) =>
            value.id === item.id
              ? {
                  ...value,
                  isCompleted: complete,
                  completedAt: complete ? new Date().toISOString() : null,
                }
              : value,
          ),
        ),
    );
  };

  const movePurchased = () => {
    const purchasedIds = completed.map((item) => item.id);
    const purchasedIdSet = new Set(purchasedIds);
    execute(
      () => movePurchasedToPantryAction(purchasedIds),
      `${purchasedIds.length} purchased items moved to the pantry`,
      () =>
        setItems((current) =>
          current.filter((item) => !purchasedIdSet.has(item.id)),
        ),
    );
  };

  return (
    <div
      className={cn("space-y-7", shoppingMode && "mx-auto max-w-2xl text-lg")}
    >
      {mutationError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Shopping list unchanged</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{mutationError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMutationError(null)}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          Add item
        </Button>
        <Button
          variant={shoppingMode ? "secondary" : "outline"}
          onClick={() => setShoppingMode(!shoppingMode)}
        >
          <Smartphone className="size-4" />
          Shopping mode
        </Button>
        {completed.length > 0 && (
          <Button variant="outline" disabled={pending} onClick={movePurchased}>
            <PackageCheck className="size-4" />
            Move purchased to pantry
          </Button>
        )}
      </div>

      <section className="space-y-3" aria-labelledby="shopping-needed">
        <div className="flex items-center gap-3">
          <h2 id="shopping-needed" className="text-xl font-semibold">
            Still needed
          </h2>
          <Badge variant="secondary">{unchecked.length}</Badge>
        </div>
        {unchecked.length > 0 ? (
          <ul className="grid gap-2">
            {unchecked.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                large={shoppingMode}
                pending={pending}
                onToggle={() => toggle(item)}
                onDelete={() => {
                  execute(
                    () => deleteShoppingItemAction(item.id),
                    "Item removed",
                    () =>
                      setItems((current) =>
                        current.filter((value) => value.id !== item.id),
                      ),
                  );
                }}
              />
            ))}
          </ul>
        ) : (
          <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-border text-center">
            <div>
              {items.length === 0 ? (
                <ShoppingBasket className="mx-auto size-10 text-primary-text" />
              ) : (
                <Check className="mx-auto size-10 text-primary-text" />
              )}
              <h3 className="mt-3 font-semibold">
                {items.length === 0
                  ? "Start your shopping list"
                  : "Everything is checked off"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {items.length === 0
                  ? "Add an item above, or send missing ingredients here from a recipe."
                  : "Move purchased items to the pantry when you are ready."}
              </p>
            </div>
          </div>
        )}
      </section>

      {completed.length > 0 && (
        <section className="space-y-3" aria-labelledby="shopping-completed">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2
                id="shopping-completed"
                className="text-xl font-semibold text-muted-foreground"
              >
                Purchased
              </h2>
              <Badge variant="outline">{completed.length}</Badge>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  Clear completed
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear purchased items?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes checked items without adding them to the
                    pantry.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={pending}
                    onClick={() =>
                      execute(
                        clearCompletedShoppingAction,
                        "Completed items cleared",
                        () =>
                          setItems((current) =>
                            current.filter((item) => !item.isCompleted),
                          ),
                      )
                    }
                  >
                    Clear items
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <ul className="grid gap-2 opacity-70">
            {completed.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                large={shoppingMode}
                pending={pending}
                onToggle={() => toggle(item)}
                onDelete={() => {
                  execute(
                    () => deleteShoppingItemAction(item.id),
                    "Item removed",
                    () =>
                      setItems((current) =>
                        current.filter((value) => value.id !== item.id),
                      ),
                  );
                }}
              />
            ))}
          </ul>
        </section>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add shopping item</DialogTitle>
            <DialogDescription>
              Existing duplicates are merged when their units are compatible.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Ingredient catalog</Label>
              <Select
                value={ingredientId || "custom"}
                onValueChange={chooseIngredient}
              >
                <SelectTrigger
                  className="w-full"
                  aria-label="Ingredient catalog"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom item</SelectItem>
                  {catalog.map((ingredient) => (
                    <SelectItem key={ingredient.id} value={ingredient.id}>
                      {ingredient.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="shopping-name">Item name</Label>
              <Input
                id="shopping-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopping-quantity">Quantity</Label>
              <Input
                id="shopping-quantity"
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopping-unit">Unit</Label>
              <Input
                id="shopping-unit"
                list="shopping-units"
                value={unit}
                onChange={(event) => setUnit(event.target.value)}
              />
            </div>
          </div>
          <datalist id="shopping-units">
            {UNITS.map((value) => (
              <option key={value} value={value} />
            ))}
          </datalist>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addItem} disabled={pending || !name.trim()}>
              {pending && <LoaderCircle className="size-4 animate-spin" />}Add
              item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ShoppingRow({
  item,
  large,
  pending,
  onToggle,
  onDelete,
}: {
  item: ShoppingListItem;
  large: boolean;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border bg-card p-4",
        large && "min-h-20 p-5",
      )}
    >
      <Checkbox
        checked={item.isCompleted}
        onCheckedChange={onToggle}
        disabled={pending}
        className={large ? "size-7" : ""}
        aria-label={`Mark ${item.ingredientName} ${item.isCompleted ? "needed" : "purchased"}`}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-semibold [overflow-wrap:anywhere]",
            item.isCompleted && "text-muted-foreground line-through",
            large && "text-xl",
          )}
        >
          {item.quantity !== null && `${item.quantity} ${item.unit ?? ""} `}
          {item.ingredientName}
        </p>
        {item.recipeId && (
          <Link
            href={`/recipes/${item.recipeId}`}
            className="mt-1 block text-xs text-primary-text [overflow-wrap:anywhere] hover:underline"
          >
            For {item.recipeTitle ?? "a recipe"}
          </Link>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={pending}
        aria-label={`Delete ${item.ingredientName}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}
