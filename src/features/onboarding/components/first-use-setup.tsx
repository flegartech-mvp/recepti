"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpenText,
  Check,
  FileUp,
  LoaderCircle,
  Refrigerator,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DEFAULT_STARTER_PANTRY_SLUGS,
  PANTRY_GROUPS,
  starterRecipeChoices,
  type StarterRecipeId,
} from "@/data/first-use";
import { getIngredientDefinition } from "@/data/pantry-starters";
import { bootstrapPersonalCookbookAction } from "@/features/onboarding/actions";
import { cn } from "@/lib/utils";

export function FirstUseSetup({
  includeRecipes,
  includePantry,
}: {
  includeRecipes: boolean;
  includePantry: boolean;
}) {
  const { locale, t, formatNumber } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [recipeIds, setRecipeIds] = useState<Set<StarterRecipeId>>(
    new Set(
      includeRecipes ? starterRecipeChoices.map((recipe) => recipe.id) : [],
    ),
  );
  const [pantrySlugs, setPantrySlugs] = useState<Set<string>>(
    new Set(includePantry ? DEFAULT_STARTER_PANTRY_SLUGS : []),
  );

  const selectionCount = recipeIds.size + pantrySlugs.size;

  if (!includeRecipes && !includePantry) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary-soft p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Check className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">
          {t("Your cookbook is ready")}
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {t(
            "You already have recipes and pantry items. Open the matcher to see what you can cook.",
          )}
        </p>
        <Link
          href="/cook-with-what-i-have?guided=1"
          className={buttonVariants({ className: "mt-6" })}
        >
          {t("Show my matches")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  const toggleRecipe = (id: StarterRecipeId, checked: boolean) =>
    setRecipeIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const togglePantry = (slug: string, checked: boolean) =>
    setPantrySlugs((current) => {
      const next = new Set(current);
      if (checked) next.add(slug);
      else next.delete(slug);
      return next;
    });

  const submit = () => {
    setError("");
    startTransition(async () => {
      const result = await bootstrapPersonalCookbookAction({
        locale,
        recipeIds: [...recipeIds],
        pantrySlugs: [...pantrySlugs],
      });
      if (!result.ok) {
        setError(t(result.message));
        return;
      }
      toast.success(t("Your starter cookbook is ready."));
      router.push("/cook-with-what-i-have?guided=1");
    });
  };

  return (
    <div className="space-y-6">
      {includeRecipes ? (
        <section
          className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_var(--shadow)] sm:p-7"
          aria-labelledby="starter-recipes-title"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text">
              <BookOpenText className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="starter-recipes-title"
                className="text-xl font-semibold tracking-tight"
              >
                {t("Choose a starter recipe shelf")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t(
                  "These editable recipes are useful examples, not locked demo content.",
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {starterRecipeChoices.map((recipe, index) => {
              const checked = recipeIds.has(recipe.id);
              return (
                <label
                  key={recipe.id}
                  className={cn(
                    "grid min-h-20 cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-4 rounded-xl border p-4 transition-colors",
                    checked
                      ? "border-primary/35 bg-primary-soft/65"
                      : "border-border bg-surface hover:bg-surface-secondary",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleRecipe(recipe.id, value === true)
                    }
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {recipe.title[locale]}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {recipe.description[locale]}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {t("{count} min", {
                      count: formatNumber(recipe.minutes),
                    })}
                  </span>
                  {index === 0 ? (
                    <span className="sr-only">
                      {t("Designed to match the recommended pantry selection.")}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </section>
      ) : null}

      {includePantry ? (
        <section
          className="rounded-2xl border border-border bg-surface p-5 shadow-[0_8px_24px_var(--shadow)] sm:p-7"
          aria-labelledby="starter-pantry-title"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Refrigerator className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2
                id="starter-pantry-title"
                className="text-xl font-semibold tracking-tight"
              >
                {t("Select what you usually keep at home")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t(
                  "Common basics are preselected. Remove anything you do not have, then adjust quantities later.",
                )}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-[0.8fr_0.8fr_1.4fr]">
            {PANTRY_GROUPS.map((group) => (
              <fieldset
                key={group.id}
                className="rounded-xl border border-border bg-card p-4"
              >
                <legend className="px-1 text-sm font-semibold">
                  {group.title[locale]}
                </legend>
                <div className="mt-2 grid gap-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-1 xl:grid-cols-2">
                  {group.slugs.map((slug) => {
                    const definition = getIngredientDefinition(slug);
                    if (!definition) return null;
                    const checked = pantrySlugs.has(slug);
                    return (
                      <label
                        key={slug}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-primary-soft"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            togglePantry(slug, value === true)
                          }
                        />
                        <span>{definition.names[locale]}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </section>
      ) : null}

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>{t("Setup stopped safely")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary-soft p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5" aria-hidden="true" />
            {t("Your first match comes next")}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/70">
            {t(
              "We will save your selection, run the real matcher, and explain anything that is missing.",
            )}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="w-full shrink-0 sm:w-auto"
          disabled={pending || selectionCount === 0}
          onClick={submit}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4" aria-hidden="true" />
          )}
          {pending ? t("Creating cookbook…") : t("Create starter cookbook")}
        </Button>
      </section>

      <div className="flex flex-col items-start justify-between gap-3 text-sm sm:flex-row sm:items-center">
        <Link
          href="/settings?tab=data"
          className="inline-flex min-h-11 items-center gap-2 text-primary-text underline-offset-4 hover:underline"
        >
          <FileUp className="size-4" aria-hidden="true" />
          {t("Import structured JSON cookbook data")}
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {t("Skip for now")}
        </Link>
      </div>
    </div>
  );
}
