"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  ListChecks,
} from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TimerControls } from "@/features/cooking/timer-controls";
import { useCookingSession } from "@/features/cooking/use-cooking-session";
import { formatScaledQuantity } from "@/lib/domain";
import type { Recipe } from "@/types/domain";

interface DemoCookingModeProps {
  recipe: Recipe;
  servings: number;
  onBack: () => void;
  onFinish: () => void;
}

export function DemoCookingMode({
  recipe,
  servings,
  onBack,
  onFinish,
}: DemoCookingModeProps) {
  const { t, formatNumber } = useI18n();
  const {
    currentStepIndex,
    checkedIngredientIds,
    timers,
    selectStep,
    toggleIngredient,
    startTimer,
    pauseTimer,
    resetTimer,
    finishSession,
  } = useCookingSession(recipe.id, recipe.ingredients, recipe.steps);
  const currentStep = recipe.steps[currentStepIndex];
  const currentTimer = timers.find((timer) => timer.stepId === currentStep?.id);

  const finish = () => {
    finishSession();
    onFinish();
  };

  return (
    <section className="space-y-6" aria-labelledby="demo-cooking-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("Back to recipe")}
        </Button>
        <Badge variant="secondary">{t("Browser-only cooking session")}</Badge>
      </div>

      <header className="rounded-2xl border border-primary/20 bg-primary-soft p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ChefHat className="size-5" aria-hidden="true" />
        </span>
        <h1
          id="demo-cooking-heading"
          className="mt-5 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
        >
          {recipe.title}
        </h1>
        <p className="mt-2 text-foreground/75">
          {t("Cooking for {count}", { count: formatNumber(servings) })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_var(--shadow)] sm:p-6">
          <div className="flex items-center gap-3">
            <ListChecks
              className="size-5 text-primary-text"
              aria-hidden="true"
            />
            <h2 className="text-xl font-semibold">{t("Prep checklist")}</h2>
          </div>
          <ul className="mt-4 space-y-1">
            {recipe.ingredients.map((ingredient) => {
              const checked = checkedIngredientIds.includes(ingredient.id);
              return (
                <li key={ingredient.id}>
                  <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-primary-soft">
                    <Checkbox
                      className="mt-0.5"
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleIngredient(ingredient.id, value === true)
                      }
                      aria-label={t("Prepare {name}", {
                        name: ingredient.displayName,
                      })}
                    />
                    <span
                      className={
                        checked
                          ? "min-w-0 text-muted-foreground line-through"
                          : "min-w-0"
                      }
                    >
                      <strong className="font-semibold">
                        {formatScaledQuantity(
                          ingredient.quantity,
                          recipe.servings,
                          servings,
                        )}{" "}
                        {ingredient.unit ?? ""}
                      </strong>{" "}
                      {ingredient.displayName}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_8px_24px_var(--shadow)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-primary-text">
                {t("Step {number}", {
                  number: formatNumber(currentStepIndex + 1),
                })}
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {t("Follow one clear step at a time")}
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              {formatNumber(currentStepIndex + 1)}/
              {formatNumber(recipe.steps.length)}
            </span>
          </div>

          <div className="mt-6 min-h-32 rounded-2xl bg-surface-secondary p-5 sm:p-7">
            <p className="text-lg leading-relaxed sm:text-xl">
              {currentStep?.instruction}
            </p>
          </div>

          {currentTimer ? (
            <div className="mt-5">
              <TimerControls
                timer={currentTimer}
                onStart={startTimer}
                onPause={pauseTimer}
                onReset={resetTimer}
              />
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("This step has no timer. Move on when it is complete.")}
            </p>
          )}

          <div className="mt-6 flex flex-wrap justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={currentStepIndex === 0}
              onClick={() => selectStep(currentStepIndex - 1)}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {t("Previous step")}
            </Button>
            {currentStepIndex < recipe.steps.length - 1 ? (
              <Button
                type="button"
                onClick={() => selectStep(currentStepIndex + 1)}
              >
                {t("Next step")}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" onClick={finish}>
                <Check className="size-4" aria-hidden="true" />
                {t("Finish demo cook")}
              </Button>
            )}
          </div>

          <nav
            className="mt-7 flex gap-2 overflow-x-auto pb-1"
            aria-label={t("Cooking steps")}
          >
            {recipe.steps.map((step, index) => (
              <Button
                key={step.id}
                type="button"
                size="sm"
                variant={index === currentStepIndex ? "default" : "outline"}
                className="shrink-0"
                onClick={() => selectStep(index)}
                aria-current={index === currentStepIndex ? "step" : undefined}
              >
                {t("Step {number}", { number: formatNumber(index + 1) })}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </section>
  );
}
