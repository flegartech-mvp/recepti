"use client";

import { useMemo, useState } from "react";
import { PackageSearch, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { rankRecipes, type MatchCategory } from "@/lib/domain";
import type { Ingredient, PantryItem, Recipe } from "@/types/domain";

import { MatchCard } from "./match-card";
import { MatcherSidebar } from "./matcher-sidebar";

const categoryContent: Record<
  MatchCategory,
  { title: string; description: string }
> = {
  ready_to_cook: {
    title: "Ready to cook",
    description: "Every required ingredient is available.",
  },
  almost_ready: {
    title: "Almost ready",
    description:
      "Only a small number of ingredients or quantities stand in the way.",
  },
  possible_with_substitutions: {
    title: "Possible with saved substitutions",
    description:
      "Only substitutions explicitly stored in Nana's Recipes appear here.",
  },
  not_enough_ingredients: {
    title: "Not enough ingredients",
    description: "Lower matches that may still help with planning.",
  },
};

export function RecipeMatcher({
  recipes,
  pantry,
  catalog,
  guided = false,
}: {
  recipes: Recipe[];
  pantry: PantryItem[];
  catalog: Ingredient[];
  guided?: boolean;
}) {
  const { locale, t, plural } = useI18n();
  const [selectedPantry, setSelectedPantry] = useState<Set<string>>(
    new Set(pantry.map((item) => item.id)),
  );
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [ignoreStaples, setIgnoreStaples] = useState(true);
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [maxTime, setMaxTime] = useState("all");
  const [dietary, setDietary] = useState("");
  const available = useMemo(
    () => [
      ...pantry.filter((item) => selectedPantry.has(item.id)),
      ...manualIds.flatMap((id) => {
        const ingredient = catalog.find((item) => item.id === id);
        return ingredient
          ? [{ ingredient, quantity: null, unit: ingredient.defaultUnit }]
          : [];
      }),
    ],
    [catalog, manualIds, pantry, selectedPantry],
  );
  const results = useMemo(
    () =>
      rankRecipes(recipes, available, {
        ignoreStaples,
        stapleIngredients: catalog.filter((item) => item.isStaple),
        excludedIngredients: excludedIds.map((id) => ({ ingredientId: id })),
        filters: {
          categories: category === "all" ? undefined : [category],
          difficulties: difficulty === "all" ? undefined : [difficulty],
          maxTotalMinutes: maxTime === "all" ? undefined : Number(maxTime),
          dietaryTags: dietary.trim() ? [dietary.trim()] : undefined,
        },
      }),
    [
      available,
      catalog,
      category,
      dietary,
      difficulty,
      excludedIds,
      ignoreStaples,
      maxTime,
      recipes,
    ],
  );
  const grouped = (Object.keys(categoryContent) as MatchCategory[]).map(
    (key) => ({
      key,
      results: results.filter((result) => result.category === key),
    }),
  );
  return (
    <div className="space-y-6">
      {guided && (
        <Alert className="border-primary/25 bg-primary-soft">
          <Sparkles className="size-4" aria-hidden="true" />
          <AlertTitle>{t("Your first matches are ready")}</AlertTitle>
          <AlertDescription>
            {t(
              "Recipes are ranked with your saved pantry. Open the first result to see the full match explanation.",
            )}
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-6 xl:grid-cols-[21rem_1fr]">
        <MatcherSidebar
          pantry={pantry}
          catalog={catalog}
          selectedPantry={selectedPantry}
          setSelectedPantry={setSelectedPantry}
          manualIds={manualIds}
          setManualIds={setManualIds}
          excludedIds={excludedIds}
          setExcludedIds={setExcludedIds}
          ignoreStaples={ignoreStaples}
          setIgnoreStaples={setIgnoreStaples}
          category={category}
          setCategory={setCategory}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          maxTime={maxTime}
          setMaxTime={setMaxTime}
          dietary={dietary}
          setDietary={setDietary}
          localeName={locale === "sl" ? "sl-SI" : "en-GB"}
        />
        <div className="space-y-9" aria-live="polite">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {plural(results.length, {
                one: "{count} recipe ranked",
                two: "{count} recipes ranked-two",
                few: "{count} recipes ranked-few",
                other: "{count} recipes ranked",
              })}
            </p>
            <Badge variant="secondary">
              {plural(available.length, {
                one: "{count} ingredient selected",
                two: "{count} ingredients selected-two",
                few: "{count} ingredients selected-few",
                other: "{count} ingredients selected",
              })}
            </Badge>
          </div>
          {grouped.map(
            (group) =>
              group.results.length > 0 && (
                <section
                  key={group.key}
                  className="space-y-4"
                  aria-labelledby={`matcher-${group.key}`}
                >
                  <div>
                    <h2
                      id={`matcher-${group.key}`}
                      className="text-2xl font-semibold tracking-tight"
                    >
                      {t(categoryContent[group.key].title)}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t(categoryContent[group.key].description)}
                    </p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {group.results.map((result) => (
                      <MatchCard key={result.recipe.id} result={result} />
                    ))}
                  </div>
                </section>
              ),
          )}
          {results.length === 0 && (
            <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border text-center">
              <div>
                <PackageSearch className="mx-auto size-12 text-primary-text" />
                <h2 className="mt-4 text-xl font-semibold">
                  {t("No recipes fit these filters")}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {t("Broaden the time, meal, difficulty, or dietary choices.")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
