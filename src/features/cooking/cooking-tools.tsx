"use client";

import { Bell, Timer as TimerIcon } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { IngredientChecklist } from "./ingredient-checklist";
import { TimerControls } from "./timer-controls";
import type { CookingTimer } from "./use-cooking-session";
import type { Recipe } from "@/types/domain";

type NotificationState = NotificationPermission | "unsupported";

export function CookingTools({
  recipe,
  checkedIds,
  activeTimers,
  notificationState,
  toggleIngredient,
  startTimer,
  pauseTimer,
  resetTimer,
  requestNotifications,
}: {
  recipe: Recipe;
  checkedIds: ReadonlySet<string>;
  activeTimers: CookingTimer[];
  notificationState: NotificationState;
  toggleIngredient: (id: string, checked: boolean) => void;
  startTimer: (stepId: string) => void;
  pauseTimer: (stepId: string) => void;
  resetTimer: (stepId: string) => void;
  requestNotifications: () => Promise<void>;
}) {
  const { t, formatNumber, plural } = useI18n();
  return (
    <aside
      className="space-y-5 lg:sticky lg:top-24"
      aria-label={t("Cooking tools")}
    >
      <section
        className="bg-card border-border/80 rounded-2xl border p-4 sm:p-5"
        aria-labelledby="ingredient-checklist-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="ingredient-checklist-title" className="font-semibold">
              {t("Ingredients")}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {t("{checked} of {total} prepared", {
                checked: formatNumber(checkedIds.size),
                total: formatNumber(recipe.ingredients.length),
              })}
            </p>
          </div>
          <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 font-mono text-xs tabular-nums">
            {plural(recipe.servings, {
              one: "{count} serving",
              two: "{count} servings-two",
              few: "{count} servings-few",
              other: "{count} servings",
            })}
          </span>
        </div>
        <IngredientChecklist
          ingredients={recipe.ingredients}
          checkedIds={checkedIds}
          onCheckedChange={toggleIngredient}
        />
      </section>
      <section
        className="bg-card border-border/80 rounded-2xl border p-4 sm:p-5"
        aria-labelledby="active-timers-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="active-timers-title" className="font-semibold">
              {t("Timers")}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {t("Independent timers stay active between steps.")}
            </p>
          </div>
          <TimerIcon
            className="text-primary-text mt-0.5 size-5"
            aria-hidden="true"
          />
        </div>
        {activeTimers.length > 0 ? (
          <div className="mt-4 space-y-3">
            {activeTimers.map((timer) => (
              <TimerControls
                key={timer.stepId}
                timer={timer}
                compact
                onStart={startTimer}
                onPause={pauseTimer}
                onReset={resetTimer}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground bg-muted/55 mt-4 rounded-xl px-3 py-4 text-sm leading-6">
            {t(
              "Start a step timer and it will appear here while you move through the recipe.",
            )}
          </p>
        )}
        {notificationState !== "granted" &&
        notificationState !== "unsupported" ? (
          <Button
            type="button"
            variant="ghost"
            className="mt-3 min-h-11 w-full justify-start"
            onClick={() => void requestNotifications()}
            disabled={notificationState === "denied"}
          >
            <Bell aria-hidden="true" />
            {notificationState === "denied"
              ? t("Notifications blocked in browser")
              : t("Enable timer notifications")}
          </Button>
        ) : null}
      </section>
    </aside>
  );
}
