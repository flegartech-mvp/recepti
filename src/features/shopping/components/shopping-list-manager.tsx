"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  PackageCheck,
  Plus,
  ShoppingBasket,
  Smartphone,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  clearCompletedShoppingAction,
  deleteShoppingItemAction,
  movePurchasedToPantryAction,
  saveShoppingItemAction,
  toggleShoppingItemAction,
} from "@/features/shopping/actions";
import { runShoppingMutation } from "@/features/shopping/mutation";
import { localizedIngredientName } from "@/lib/domain/ingredient-search";
import type { IngredientSearchResult } from "@/lib/domain/ingredient-search";
import type { ShoppingListItemInput } from "@/lib/validation";
import { cn } from "@/lib/utils";
import type { Ingredient, ShoppingListItem } from "@/types/domain";

import { ShoppingItemDialog } from "./shopping-item-dialog";
import { ShoppingGroup } from "./shopping-group";
import { PackagePlanSummary } from "./package-plan-summary";
import { ShoppingRow } from "./shopping-row";

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
  const { locale, t, formatNumber, plural } = useI18n();
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
  const localizedItems = useMemo(
    () =>
      items.map((item) => {
        const ingredient = catalog.find(
          (candidate) => candidate.id === item.ingredientId,
        );
        return ingredient
          ? {
              ...item,
              ingredientName: localizedIngredientName(ingredient, locale),
            }
          : item;
      }),
    [catalog, items, locale],
  );
  const unchecked = useMemo(
    () => localizedItems.filter((item) => !item.isCompleted),
    [localizedItems],
  );
  const completed = useMemo(
    () => localizedItems.filter((item) => item.isCompleted),
    [localizedItems],
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
        toast.error(t(result.message));
        router.refresh();
        return;
      }
      if (success) toast.success(t(success));
      after?.();
      router.refresh();
    });
  const chooseIngredient = (result: IngredientSearchResult) => {
    setIngredientId(isUuid(result.ingredient.id) ? result.ingredient.id : "");
    setName(result.displayName);
    setUnit(result.ingredient.defaultUnit ?? "");
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
  const deleteItem = (item: ShoppingListItem) =>
    execute(
      () => deleteShoppingItemAction(item.id),
      "Item removed",
      () =>
        setItems((current) => current.filter((value) => value.id !== item.id)),
    );
  const movePurchased = () => {
    const purchasedIds = completed.map((item) => item.id);
    const purchasedIdSet = new Set(purchasedIds);
    execute(
      () => movePurchasedToPantryAction(purchasedIds),
      plural(purchasedIds.length, {
        one: "{count} purchased item moved to the pantry",
        two: "{count} purchased items moved to the pantry-two",
        few: "{count} purchased items moved to the pantry-few",
        other: "{count} purchased items moved to the pantry",
      }),
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
          <AlertTitle>{t("Shopping list unchanged")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t(mutationError)}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setMutationError(null)}
            >
              {t("Dismiss")}
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <PackagePlanSummary items={unchecked} />
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          {t("Add item")}
        </Button>
        <Button
          variant={shoppingMode ? "secondary" : "outline"}
          onClick={() => setShoppingMode(!shoppingMode)}
        >
          <Smartphone className="size-4" />
          {t("Shopping mode")}
        </Button>
        {completed.length > 0 && (
          <Button variant="outline" disabled={pending} onClick={movePurchased}>
            <PackageCheck className="size-4" />
            {t("Move purchased to pantry")}
          </Button>
        )}
      </div>

      <ShoppingGroup
        title={t("Still needed")}
        id="shopping-needed"
        count={unchecked.length}
      >
        {unchecked.length > 0 ? (
          <ul className="grid gap-2">
            {unchecked.map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                large={shoppingMode}
                pending={pending}
                onToggle={() => toggle(item)}
                onDelete={() => deleteItem(item)}
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
                {t(
                  items.length === 0
                    ? "Start your shopping list"
                    : "Everything is checked off",
                )}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  items.length === 0
                    ? "Add an item above, or send missing ingredients here from a recipe."
                    : "Move purchased items to the pantry when you are ready.",
                )}
              </p>
            </div>
          </div>
        )}
      </ShoppingGroup>

      {completed.length > 0 && (
        <section className="space-y-3" aria-labelledby="shopping-completed">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2
                id="shopping-completed"
                className="text-xl font-semibold text-muted-foreground"
              >
                {t("Purchased")}
              </h2>
              <Badge variant="outline">{formatNumber(completed.length)}</Badge>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  {t("Clear completed")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("Clear purchased items?")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "This deletes checked items without adding them to the pantry.",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
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
                    {t("Clear items")}
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
                onDelete={() => deleteItem(item)}
              />
            ))}
          </ul>
        </section>
      )}
      <ShoppingItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        name={name}
        quantity={quantity}
        unit={unit}
        catalog={catalog}
        pending={pending}
        onNameChange={(value) => {
          setIngredientId("");
          setName(value);
        }}
        onQuantityChange={setQuantity}
        onUnitChange={setUnit}
        onIngredientSelect={chooseIngredient}
        onAdd={addItem}
      />
    </div>
  );
}
