"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ChefHat,
  Clock3,
  LoaderCircle,
  PackageSearch,
  Plus,
  Search,
  ShoppingBasket,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { addMissingToShoppingAction } from "@/features/recipes/actions";
import { DIFFICULTIES, MEAL_CATEGORIES } from "@/lib/constants";
import {
  rankRecipes,
  type MatchCategory,
  type RecipeMatchResult,
} from "@/lib/domain";
import type { Ingredient, PantryItem, Recipe } from "@/types/domain";
import { getMatchReason } from "@/features/matcher/match-copy";

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
}: {
  recipes: Recipe[];
  pantry: PantryItem[];
  catalog: Ingredient[];
}) {
  const { locale, t, formatNumber, plural } = useI18n();
  const localeName = locale === "sl" ? "sl-SI" : "en-GB";
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
  const [pantrySearch, setPantrySearch] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");

  const visiblePantry = pantry.filter((item) =>
    item.ingredient.displayName
      .toLocaleLowerCase(localeName)
      .includes(pantrySearch.trim().toLocaleLowerCase(localeName)),
  );

  const manualOptions = catalog.filter((item) =>
    item.displayName
      .toLocaleLowerCase(localeName)
      .includes(ingredientSearch.trim().toLocaleLowerCase(localeName)),
  );

  const available = useMemo(
    () => [
      ...pantry.filter((item) => selectedPantry.has(item.id)),
      ...manualIds.map((id) => {
        const ingredient = catalog.find((item) => item.id === id)!;
        return { ingredient, quantity: null, unit: ingredient.defaultUnit };
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
    <div className="grid gap-6 xl:grid-cols-[21rem_1fr]">
      <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Available ingredients")}</h2>
            </CardTitle>
            <CardDescription>
              {t("Use everything or uncheck items you do not want to use.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={pantrySearch}
                onChange={(event) => setPantrySearch(event.target.value)}
                className="pl-10"
                placeholder={t("Search pantry")}
                aria-label={t("Search pantry ingredients")}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setSelectedPantry(new Set(pantry.map((item) => item.id)))
                }
              >
                {t("Use all")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedPantry(new Set())}
              >
                {t("Clear all")}
              </Button>
            </div>
            <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
              {visiblePantry.map((item) => (
                <label
                  key={item.id}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm transition-colors duration-200 hover:bg-primary-soft"
                >
                  <Checkbox
                    checked={selectedPantry.has(item.id)}
                    onCheckedChange={(checked) =>
                      setSelectedPantry((current) => {
                        const next = new Set(current);
                        if (checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      })
                    }
                  />
                  <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">
                    {item.ingredient.displayName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.quantity === null ? "?" : formatNumber(item.quantity)}{" "}
                    {item.unit ?? ""}
                  </span>
                </label>
              ))}
              {visiblePantry.length === 0 && (
                <p className="rounded-lg bg-surface-secondary px-3 py-4 text-sm text-muted-foreground">
                  {t("No pantry ingredients match that search.")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Manual and excluded")}</h2>
            </CardTitle>
            <CardDescription>
              {t("Add something not in the pantry, or block an ingredient.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={ingredientSearch}
                onChange={(event) => setIngredientSearch(event.target.value)}
                className="pl-10"
                placeholder={t("Find ingredient")}
                aria-label={t("Find ingredient")}
              />
            </div>
            {ingredientSearch && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-1">
                {manualOptions.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex min-w-0 items-center gap-1"
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-w-0 flex-1 justify-start whitespace-normal text-left [overflow-wrap:anywhere]"
                      onClick={() => {
                        if (!manualIds.includes(item.id))
                          setManualIds([...manualIds, item.id]);
                        setIngredientSearch("");
                      }}
                    >
                      <Plus className="size-3.5" />
                      {item.displayName}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!excludedIds.includes(item.id))
                          setExcludedIds([...excludedIds, item.id]);
                        setIngredientSearch("");
                      }}
                      aria-label={t("Exclude {name}", {
                        name: item.displayName,
                      })}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {manualIds.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t("Added manually")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {manualIds.map((id) => {
                    const item = catalog.find((value) => value.id === id)!;
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="max-w-full shrink overflow-visible whitespace-normal py-1 pl-2 pr-1 [overflow-wrap:anywhere]"
                      >
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {item.displayName}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          className="-my-2 -mr-1 shrink-0 rounded-full text-current hover:bg-foreground/10 hover:text-current"
                          onClick={() =>
                            setManualIds(
                              manualIds.filter((value) => value !== id),
                            )
                          }
                          aria-label={t("Remove {name}", {
                            name: item.displayName,
                          })}
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
            {excludedIds.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  {t("Excluded")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {excludedIds.map((id) => {
                    const item = catalog.find((value) => value.id === id)!;
                    return (
                      <Badge
                        key={id}
                        variant="destructive"
                        className="max-w-full shrink overflow-visible whitespace-normal py-1 pl-2 pr-1 [overflow-wrap:anywhere]"
                      >
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {item.displayName}
                        </span>
                        <Button
                          type="button"
                          size="icon-xs"
                          variant="ghost"
                          className="-my-2 -mr-1 shrink-0 rounded-full text-current hover:bg-destructive/15 hover:text-current"
                          onClick={() =>
                            setExcludedIds(
                              excludedIds.filter((value) => value !== id),
                            )
                          }
                          aria-label={t("Allow {name}", {
                            name: item.displayName,
                          })}
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("Recipe filters")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="flex items-center justify-between gap-4 text-sm font-medium">
              {t("Ignore basic staples")}
              <Switch
                checked={ignoreStaples}
                onCheckedChange={setIgnoreStaples}
              />
            </label>
            <div className="space-y-2">
              <Label>{t("Meal")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full" aria-label={t("Meal")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All meals")}</SelectItem>
                  {MEAL_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {t(item.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Difficulty")}</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-full" aria-label={t("Difficulty")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Any difficulty")}</SelectItem>
                  {DIFFICULTIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {t(item.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Maximum time")}</Label>
              <Select value={maxTime} onValueChange={setMaxTime}>
                <SelectTrigger
                  className="w-full"
                  aria-label={t("Maximum time")}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Any time")}</SelectItem>
                  {[20, 30, 45].map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {t("{count} minutes", { count: formatNumber(minutes) })}
                    </SelectItem>
                  ))}
                  <SelectItem value="60">{t("1 hour")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matcher-dietary">{t("Dietary tag")}</Label>
              <Input
                id="matcher-dietary"
                value={dietary}
                onChange={(event) => setDietary(event.target.value)}
                placeholder={t("Vegetarian")}
              />
            </div>
          </CardContent>
        </Card>
      </aside>

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
  );
}

function MatchCard({ result }: { result: RecipeMatchResult }) {
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
