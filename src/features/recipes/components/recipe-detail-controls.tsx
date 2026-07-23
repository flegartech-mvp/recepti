"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChefHat,
  Copy,
  Heart,
  LoaderCircle,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ShoppingBasket,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/components/i18n-provider";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addMissingToShoppingAction,
  addRecipeToPantryAction,
  deleteRecipeAction,
  duplicateRecipeAction,
  markRecipeCookedAction,
  toggleFavoriteAction,
} from "@/features/recipes/actions";
import { formatScaledQuantity } from "@/lib/domain";
import type { RecipeMatchResult } from "@/lib/domain";
import type { Recipe } from "@/types/domain";
import { getMatchReason } from "@/features/matcher/match-copy";
import { localStorageKey } from "@/features/settings/local-data";

export function RecipeDetailControls({
  recipe,
  match,
}: {
  recipe: Recipe;
  match: RecipeMatchResult;
}) {
  const router = useRouter();
  const { t, formatList, formatNumber, plural } = useI18n();
  const [pending, startTransition] = useTransition();
  const [favorite, setFavorite] = useState(recipe.isFavorite);
  const [servings, setServings] = useState(recipe.servings);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const storageKey = localStorageKey(`cooking-checklist:${recipe.id}`);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(storageKey) ?? "[]",
        ) as unknown;
        if (Array.isArray(stored))
          setChecked(
            new Set(
              stored.filter(
                (value): value is string => typeof value === "string",
              ),
            ),
          );
      } catch {
        localStorage.removeItem(storageKey);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const toggleIngredient = (id: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };

  const run = (
    action: () => Promise<{ ok: boolean; message?: string }>,
    success: string,
    after?: () => void,
    refresh = true,
  ) => {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(t(result.message ?? "The action could not be completed."));
        return;
      }
      toast.success(t(success));
      after?.();
      if (refresh) router.refresh();
    });
  };

  const deleteRecipe = () => {
    startTransition(async () => {
      const result = await deleteRecipeAction(recipe.id);
      if (!result.ok) {
        toast.error(t(result.message));
        return;
      }
      if (result.data.storageCleanupPending) {
        toast.warning(
          t(
            "Recipe deleted. A private image file may still need removal in Supabase Storage.",
          ),
        );
      } else {
        toast.success(t("Recipe deleted"));
      }
      router.replace("/recipes");
    });
  };

  const matchLabel = {
    ready_to_cook: "Ready to cook",
    almost_ready: "Almost ready",
    possible_with_substitutions: "Saved substitution available",
    not_enough_ingredients: "More ingredients needed",
  }[match.category];

  return (
    <div className="space-y-7">
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href={`/recipes/${recipe.id}/cook`}>
            <ChefHat className="size-4" aria-hidden="true" />
            {t("Start cooking")}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/recipes/${recipe.id}/edit`}>
            <Pencil className="size-4" aria-hidden="true" />
            {t("Edit")}
          </Link>
        </Button>
        <Button
          variant={favorite ? "secondary" : "outline"}
          onClick={() =>
            run(
              () => toggleFavoriteAction(recipe.id),
              favorite ? "Removed from favorites" : "Added to favorites",
              () => setFavorite(!favorite),
            )
          }
          disabled={pending}
          aria-pressed={favorite}
        >
          <Heart
            className={favorite ? "size-4 fill-current" : "size-4"}
            aria-hidden="true"
          />
          {t(favorite ? "Favorited" : "Favorite")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost">{t("More")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => window.print()}>
              <Printer className="size-4" />
              {t("Print recipe")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                startTransition(async () => {
                  const result = await duplicateRecipeAction(recipe.id);
                  if (!result.ok) {
                    toast.error(t(result.message));
                    return;
                  }
                  toast.success(t("Recipe duplicated"));
                  router.push(`/recipes/${result.data.id}`);
                })
              }
            >
              <Copy className="size-4" />
              {t("Duplicate recipe")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                run(
                  () => addRecipeToPantryAction(recipe.id),
                  "Ingredients added to pantry",
                )
              }
            >
              <PackagePlus className="size-4" />
              {t("Add ingredients to pantry")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {t("Delete")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("Delete this recipe?")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t(
                  "This removes the recipe, its ingredients, steps, and cooking history. This cannot be undone.",
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("Keep recipe")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={deleteRecipe}>
                {t("Delete recipe")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Alert
        className={
          match.category === "ready_to_cook"
            ? "border-primary/30 bg-accent/55"
            : "border-notice bg-notice/25"
        }
      >
        <Check className="size-4" aria-hidden="true" />
        <AlertTitle>
          {t(matchLabel)} {t("at")} {formatNumber(match.matchPercentage)}%
        </AlertTitle>
        <AlertDescription className="space-y-2 [overflow-wrap:anywhere]">
          <p>{getMatchReason(match, { t, formatList, plural })}</p>
          {match.missingIngredients.length > 0 && (
            <p>
              <strong>{t("Missing")}:</strong>{" "}
              {formatList(match.missingIngredients.map((item) => item.name))}
            </p>
          )}
        </AlertDescription>
        {match.missingIngredients.length > 0 && (
          <Button
            className="mt-4"
            size="sm"
            variant="outline"
            onClick={() =>
              run(
                () =>
                  addMissingToShoppingAction(
                    recipe.id,
                    match.missingIngredients.map((item) =>
                      item.key.replace(/^id:/, ""),
                    ),
                  ),
                "Missing ingredients added to the shopping list",
              )
            }
          >
            <ShoppingBasket className="size-4" aria-hidden="true" />
            {t("Add missing to list")}
          </Button>
        )}
      </Alert>

      <section
        className="print-keep rounded-2xl border border-border bg-card p-5 sm:p-7"
        aria-labelledby="ingredients-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2
              id="ingredients-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              {t("Ingredients")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Base recipe: {count} servings", {
                count: formatNumber(recipe.servings),
              })}
            </p>
          </div>
          <div
            className="no-print flex items-center rounded-xl border border-border bg-background p-1"
            aria-label={t("Adjust servings")}
          >
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() =>
                setServings((value) => Math.max(0.25, value - 0.5))
              }
              aria-label={t("Decrease servings")}
            >
              <Minus className="size-4" />
            </Button>
            <span className="min-w-20 text-center text-sm font-semibold tabular-nums">
              {t("{count} servings", { count: formatNumber(servings) })}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setServings((value) => Math.min(100, value + 0.5))}
              aria-label={t("Increase servings")}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <ul className="mt-6 grid gap-1">
          {recipe.ingredients.map((item) => {
            const selected = checked.has(item.id);
            return (
              <li
                key={item.id}
                className="flex min-h-12 items-start gap-3 rounded-xl px-2 py-2 hover:bg-muted/70"
              >
                <Checkbox
                  className="no-print mt-0.5"
                  checked={selected}
                  onCheckedChange={() => toggleIngredient(item.id)}
                  aria-label={t("Mark {name} as prepared", {
                    name: item.displayName,
                  })}
                />
                <span
                  className={
                    selected
                      ? "min-w-0 flex-1 text-muted-foreground line-through [overflow-wrap:anywhere]"
                      : "min-w-0 flex-1 [overflow-wrap:anywhere]"
                  }
                >
                  <strong className="font-semibold">
                    {formatScaledQuantity(
                      item.quantity,
                      recipe.servings,
                      servings,
                    )}{" "}
                    {item.unit ?? ""}
                  </strong>{" "}
                  {item.displayName}
                  {item.preparationNote && (
                    <span className="text-muted-foreground">
                      , {item.preparationNote}
                    </span>
                  )}
                  {item.isOptional && (
                    <Badge variant="outline" className="ml-2">
                      {t("Optional")}
                    </Badge>
                  )}
                  {item.isGarnish && (
                    <Badge variant="outline" className="ml-2">
                      {t("Garnish")}
                    </Badge>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="no-print flex flex-wrap gap-3">
        <Button
          variant="secondary"
          onClick={() =>
            run(
              () => markRecipeCookedAction(recipe.id, servings),
              "Added to cooking history",
            )
          }
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          {t("Mark as cooked")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setChecked(new Set());
            localStorage.removeItem(storageKey);
          }}
        >
          {t("Clear ingredient checks")}
        </Button>
      </div>
    </div>
  );
}
