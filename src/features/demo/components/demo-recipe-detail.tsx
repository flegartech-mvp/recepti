"use client";

import {
  ArrowLeft,
  Check,
  ChefHat,
  CircleAlert,
  Clock3,
  Minus,
  Plus,
  ShoppingBasket,
  UsersRound,
} from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMatchReason } from "@/features/matcher/match-copy";
import { MEAL_CATEGORIES } from "@/lib/constants";
import { formatScaledQuantity, type RecipeMatchResult } from "@/lib/domain";
import type { Recipe } from "@/types/domain";

interface DemoRecipeDetailProps {
  recipe: Recipe;
  match: RecipeMatchResult;
  servings: number;
  missingAdded: boolean;
  onServingsChange: (servings: number) => void;
  onBack: () => void;
  onAddMissing: () => void;
  onStartCooking: () => void;
}

export function DemoRecipeDetail({
  recipe,
  match,
  servings,
  missingAdded,
  onServingsChange,
  onBack,
  onAddMissing,
  onStartCooking,
}: DemoRecipeDetailProps) {
  const { t, plural, formatList, formatNumber } = useI18n();
  const detailByIngredient = new Map(
    match.ingredientDetails.map((detail) => [detail.key, detail]),
  );

  return (
    <article className="space-y-6" aria-labelledby="demo-recipe-title">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("Back to recipe ranking")}
      </Button>

      <header className="grid gap-6 rounded-2xl border border-primary/20 bg-primary-soft p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{t("Interactive recipe")}</Badge>
            <Badge variant="outline" className="capitalize">
              {t(
                MEAL_CATEGORIES.find(
                  (category) => category.value === recipe.category,
                )?.label ?? recipe.category,
              )}
            </Badge>
            {recipe.dietaryTags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
          <h1
            id="demo-recipe-title"
            className="mt-5 text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl"
          >
            {recipe.title}
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-foreground/75">
            {recipe.description}
          </p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground/75">
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-4" aria-hidden="true" />
              {t("{count} minutes", {
                count: formatNumber(recipe.totalMinutes),
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <UsersRound className="size-4" aria-hidden="true" />
              {t("{count} servings", { count: formatNumber(servings) })}
            </span>
          </div>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full lg:w-auto"
          onClick={onStartCooking}
        >
          <ChefHat className="size-5" aria-hidden="true" />
          {t("Start cooking")}
        </Button>
      </header>

      <section
        className={
          match.category === "ready_to_cook"
            ? "rounded-2xl border border-primary/25 bg-accent/55 p-5 sm:p-6"
            : "rounded-2xl border border-notice bg-notice/25 p-5 sm:p-6"
        }
        aria-labelledby="demo-match-heading"
      >
        <div className="flex items-start gap-3">
          {match.category === "ready_to_cook" ? (
            <Check
              className="mt-0.5 size-5 shrink-0 text-primary-text"
              aria-hidden="true"
            />
          ) : (
            <CircleAlert
              className="mt-0.5 size-5 shrink-0 text-notice-foreground"
              aria-hidden="true"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 id="demo-match-heading" className="font-semibold">
              {t("Pantry match")}: {formatNumber(match.matchPercentage)}%
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {getMatchReason(match, { t, plural, formatList })}
            </p>
          </div>
        </div>
        {match.missingIngredients.length > 0 && (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            disabled={missingAdded}
            onClick={onAddMissing}
          >
            {missingAdded ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <ShoppingBasket className="size-4" aria-hidden="true" />
            )}
            {t(
              missingAdded
                ? "Added to temporary list"
                : "Add missing to temporary list",
            )}
          </Button>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_var(--shadow)] sm:p-7"
          aria-labelledby="demo-ingredients-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2
                id="demo-ingredients-heading"
                className="text-2xl font-semibold tracking-tight"
              >
                {t("Ingredients")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("Scale quantities for your table.")}
              </p>
            </div>
            <div
              className="flex items-center rounded-xl border border-border bg-background p-1"
              aria-label={t("Adjust servings")}
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => onServingsChange(Math.max(0.5, servings - 0.5))}
                aria-label={t("Decrease servings")}
              >
                <Minus className="size-4" />
              </Button>
              <span className="min-w-20 text-center text-sm font-semibold tabular-nums">
                {formatNumber(servings)}
              </span>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => onServingsChange(Math.min(12, servings + 0.5))}
                aria-label={t("Increase servings")}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <ul className="mt-5 space-y-1">
            {recipe.ingredients.map((ingredient) => {
              const detail =
                detailByIngredient.get(`id:${ingredient.ingredientId}`) ??
                match.ingredientDetails.find(
                  (item) =>
                    item.name.toLocaleLowerCase() ===
                    ingredient.displayName.toLocaleLowerCase(),
                );
              const available =
                detail?.status === "available" ||
                detail?.status === "ignored_optional" ||
                detail?.status === "ignored_staple";
              return (
                <li
                  key={ingredient.id}
                  className="flex min-h-12 items-start gap-3 rounded-xl px-2 py-2"
                >
                  <span
                    className={
                      available
                        ? "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                        : "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-notice text-notice-foreground"
                    }
                    role="img"
                    aria-label={t(available ? "Available" : "Missing")}
                  >
                    {available ? (
                      <Check className="size-3" aria-hidden="true" />
                    ) : (
                      <CircleAlert className="size-3" aria-hidden="true" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    <strong className="font-semibold">
                      {formatScaledQuantity(
                        ingredient.quantity,
                        recipe.servings,
                        servings,
                      )}{" "}
                      {ingredient.unit ?? ""}
                    </strong>{" "}
                    {ingredient.displayName}
                    {ingredient.isOptional && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({t("Optional").toLocaleLowerCase()})
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_var(--shadow)] sm:p-7"
          aria-labelledby="demo-method-heading"
        >
          <h2
            id="demo-method-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("Method")}
          </h2>
          <ol className="mt-5 space-y-5">
            {recipe.steps.map((step, index) => (
              <li
                key={step.id}
                className="grid gap-3 sm:grid-cols-[2.5rem_1fr]"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-sm font-semibold text-primary-text">
                  {formatNumber(index + 1)}
                </span>
                <div>
                  <p className="leading-relaxed">{step.instruction}</p>
                  {step.timerSeconds && (
                    <p className="mt-1 text-sm font-medium text-primary-text">
                      {t("Timer")}:{" "}
                      {t("{count} minutes", {
                        count: formatNumber(Math.round(step.timerSeconds / 60)),
                      })}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
