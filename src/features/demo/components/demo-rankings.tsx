"use client";

import {
  ArrowRight,
  Check,
  ChefHat,
  Clock3,
  PackageSearch,
  ShoppingBasket,
} from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMatchReason } from "@/features/matcher/match-copy";
import type { RecipeMatchResult } from "@/lib/domain";

const matchLabels = {
  ready_to_cook: "Ready to cook",
  almost_ready: "Almost ready",
  possible_with_substitutions: "Saved substitution available",
  not_enough_ingredients: "More ingredients needed",
} as const;

interface DemoRankingsProps {
  results: readonly RecipeMatchResult[];
  onOpenRecipe: (recipeId: string) => void;
  onOpenShopping: () => void;
  shoppingCount: number;
}

export function DemoRankings({
  results,
  onOpenRecipe,
  onOpenShopping,
  shoppingCount,
}: DemoRankingsProps) {
  const { t, plural, formatList, formatNumber } = useI18n();

  return (
    <section aria-labelledby="demo-ranking-heading" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="demo-ranking-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("What can I cook?")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t(
              "The same quantity-aware matcher used by the private cookbook ranks these sample recipes.",
            )}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onOpenShopping}>
          <ShoppingBasket className="size-4" aria-hidden="true" />
          {t("Temporary list")}
          {shoppingCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {formatNumber(shoppingCount)}
            </Badge>
          )}
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {results.map((result) => {
          const missingNames = result.missingIngredients.map(
            (item) => item.name,
          );
          return (
            <article
              key={result.recipe.id}
              className="group grid gap-4 rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_var(--shadow)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/35 sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <div
                className={
                  result.category === "ready_to_cook"
                    ? "grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground"
                    : "grid size-12 place-items-center rounded-xl bg-primary-soft text-primary-text"
                }
                aria-hidden="true"
              >
                {result.category === "ready_to_cook" ? (
                  <Check className="size-5" />
                ) : (
                  <span className="text-sm font-semibold tabular-nums">
                    {formatNumber(result.matchPercentage)}%
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      result.category === "ready_to_cook"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {t(matchLabels[result.category])}
                  </Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" aria-hidden="true" />
                    {t("{count} minutes", {
                      count: formatNumber(result.recipe.totalMinutes ?? 0),
                    })}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-tight [overflow-wrap:anywhere]">
                  {result.recipe.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {getMatchReason(result, { t, plural, formatList })}
                </p>
                {missingNames.length > 0 && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <PackageSearch
                      className="mt-0.5 size-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>
                      {t("Missing")}: {formatList(missingNames)}
                    </span>
                  </p>
                )}
              </div>

              <Button
                type="button"
                variant={
                  result.category === "ready_to_cook" ? "default" : "outline"
                }
                className="w-full sm:w-auto"
                onClick={() => onOpenRecipe(result.recipe.id)}
                aria-label={t("Open {title}", {
                  title: result.recipe.title,
                })}
              >
                <ChefHat className="size-4" aria-hidden="true" />
                {t("Open recipe")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
