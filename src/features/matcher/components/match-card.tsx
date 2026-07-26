"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChefHat, Clock3, LoaderCircle, ShoppingBasket } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { getMatchReason } from "@/features/matcher/match-copy";
import { addMissingToShoppingAction } from "@/features/recipes/actions";
import type { RecipeMatchResult } from "@/lib/domain";

export function MatchCard({ result }: { result: RecipeMatchResult }) {
  const [pending, startTransition] = useTransition();
  const { t, formatList, formatNumber, plural } = useI18n();
  const ids = result.missingIngredients
    .map((item) => item.key.replace(/^id:/, ""))
    .filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  return (
    <article className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold tracking-tight [overflow-wrap:anywhere]">
            {result.recipe.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {getMatchReason(result, { t, formatList, plural })}
          </p>
        </div>
        <span className="text-2xl font-semibold tracking-tight text-primary-text">
          {formatNumber(result.matchPercentage)}%
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <Badge variant="secondary">
          {t("{matched} of {required} matched", {
            matched: formatNumber(result.matchedIngredientCount),
            required: formatNumber(result.requiredIngredientCount),
          })}
        </Badge>
        {result.recipe.totalMinutes != null && (
          <Badge variant="outline">
            <Clock3 className="size-3" />
            {t("{count} min", {
              count: formatNumber(result.recipe.totalMinutes),
            })}
          </Badge>
        )}
      </div>
      {result.missingIngredients.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("Missing")}
          </p>
          <p className="mt-1 text-sm [overflow-wrap:anywhere]">
            {formatList(result.missingIngredients.map((item) => item.name))}
          </p>
        </div>
      )}
      {result.availableIngredients.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("Available")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            {formatList(result.availableIngredients.map((item) => item.name))}
          </p>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={`/recipes/${result.recipe.id}`}>
            <ChefHat className="size-4" />
            {t("View recipe")}
          </Link>
        </Button>
        {result.missingIngredients.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending || ids.length === 0}
            onClick={() =>
              startTransition(async () => {
                const response = await addMissingToShoppingAction(
                  result.recipe.id,
                  ids,
                );
                if (response.ok) toast.success(t("Missing ingredients added"));
                else toast.error(t(response.message));
              })
            }
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ShoppingBasket className="size-4" />
            )}
            {t("Add missing")}
          </Button>
        )}
      </div>
    </article>
  );
}
