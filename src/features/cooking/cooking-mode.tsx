"use client";

import {
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  CloudOff,
  ListChecks,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { markRecipeCookedAction } from "@/features/recipes/actions";
import { useOnlineStatus } from "@/lib/pwa/use-online-status";
import type { Recipe } from "@/types/domain";

import { formatTimer } from "./cooking-format";
import { CookingComplete } from "./cooking-complete";
import { CookingHeader } from "./cooking-header";
import { CookingProgress } from "./cooking-progress";
import { CookingTools } from "./cooking-tools";
import { FullStepList } from "./full-step-list";
import { TimerControls } from "./timer-controls";
import { type CookingTimer, useCookingSession } from "./use-cooking-session";
import { useWakeLock } from "./use-wake-lock";

interface CookingModeProps {
  recipe: Recipe;
}

type NotificationState = NotificationPermission | "unsupported";

export function CookingMode({ recipe }: CookingModeProps) {
  const { t, formatNumber } = useI18n();
  const isOnline = useOnlineStatus();
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
  const { status: wakeLockStatus, requestWakeLock } = useWakeLock();
  const [showFullList, setShowFullList] = useState(false);
  const [notificationState, setNotificationState] =
    useState<NotificationState>("unsupported");
  const [timerAnnouncement, setTimerAnnouncement] = useState("");
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const previousTimerStatusesRef = useRef(
    new Map<string, CookingTimer["status"]>(),
  );
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const stepCardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setNotificationState(
        "Notification" in window
          ? window.Notification.permission
          : "unsupported",
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const previous = previousTimerStatusesRef.current;
    for (const timer of timers) {
      if (
        timer.status === "complete" &&
        previous.get(timer.stepId) !== "complete"
      ) {
        const timerStep = /^Step (\d+)$/.exec(timer.label);
        const localizedTimerLabel = timerStep
          ? t("Step {number}", {
              number: formatNumber(Number(timerStep[1])),
            })
          : timer.label;
        const message = t("{label} timer is finished.", {
          label: localizedTimerLabel,
        });
        setTimerAnnouncement(message);
        if (
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          try {
            new window.Notification(
              t("{label} is done", { label: localizedTimerLabel }),
              {
                body: t("{title} is ready for the next move.", {
                  title: recipe.title,
                }),
                tag: `nanas-recipes-timer-${recipe.id}-${timer.stepId}`,
              },
            );
          } catch {
            // The visible timer and live-region announcement remain the fallback.
          }
        }
      }
      previous.set(timer.stepId, timer.status);
    }
  }, [formatNumber, recipe.id, recipe.title, t, timers]);

  const currentStep = recipe.steps[currentStepIndex];
  const currentTimer = currentStep
    ? timers.find((timer) => timer.stepId === currentStep.id)
    : undefined;
  const activeTimers = timers.filter((timer) => timer.status !== "idle");
  const checkedIds = useMemo(
    () => new Set(checkedIngredientIds),
    [checkedIngredientIds],
  );

  const goToStep = useCallback(
    (index: number) => {
      selectStep(index);
      window.requestAnimationFrame(() => {
        stepCardRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        stepHeadingRef.current?.focus({ preventScroll: true });
      });
    },
    [selectStep],
  );

  const requestNotifications = useCallback(async () => {
    if (!("Notification" in window)) {
      setNotificationState("unsupported");
      return;
    }
    try {
      const permission = await window.Notification.requestPermission();
      setNotificationState(permission);
    } catch {
      setNotificationState("denied");
    }
  }, []);

  const completeRecipe = useCallback(() => {
    setCompletionError(null);
    startTransition(async () => {
      const result = await markRecipeCookedAction(recipe.id, recipe.servings);
      if (!result.ok) {
        setCompletionError(t(result.message));
        return;
      }
      finishSession();
      setIsComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [finishSession, recipe.id, recipe.servings, t]);

  if (isComplete) {
    return <CookingComplete recipe={recipe} />;
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--surface-tint)_45%,transparent),transparent_36%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--background)_88%,var(--muted)))]">
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {timerAnnouncement}
      </p>

      <CookingHeader
        recipeId={recipe.id}
        title={recipe.title}
        wakeLockStatus={wakeLockStatus}
        requestWakeLock={requestWakeLock}
      />

      <main className="mobile-cooking-content safe-inline mx-auto w-full max-w-7xl pt-6 sm:pt-8">
        {!isOnline ? (
          <Alert className="mb-5 border-warning bg-warning/85 text-warning-foreground">
            <CloudOff className="size-4" aria-hidden="true" />
            <AlertTitle>{t("Cooking offline")}</AlertTitle>
            <AlertDescription>
              {t(
                "This open recipe, checklist, and timers remain usable. Reconnect before finishing so cooking history can be saved.",
              )}
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] xl:gap-8">
          <div className="min-w-0 space-y-5">
            <CookingProgress
              currentStepIndex={currentStepIndex}
              stepCount={recipe.steps.length}
            />

            {currentStep ? (
              <article
                ref={stepCardRef}
                className="organic-shadow bg-card border-border/80 scroll-mt-24 overflow-hidden rounded-2xl border"
              >
                <div className="border-border/70 flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-8">
                  <span className="rounded-full bg-notice px-3 py-1 text-xs font-semibold tracking-[0.14em] text-notice-foreground uppercase">
                    {t("Step {number}", {
                      number: formatNumber(currentStepIndex + 1),
                    })}
                  </span>
                  {currentStep.timerSeconds ? (
                    <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-sm tabular-nums">
                      <Clock3 className="size-4" aria-hidden="true" />
                      {formatTimer(currentStep.timerSeconds)}
                    </span>
                  ) : null}
                </div>

                <div className="px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
                  <h1
                    ref={stepHeadingRef}
                    tabIndex={-1}
                    className="max-w-4xl text-2xl leading-[1.35] font-semibold tracking-tight whitespace-pre-line text-balance outline-none sm:text-3xl sm:leading-[1.3] lg:text-[2.15rem]"
                  >
                    {currentStep.instruction}
                  </h1>

                  {currentTimer ? (
                    <div className="mt-8 max-w-xl">
                      <TimerControls
                        timer={currentTimer}
                        onStart={startTimer}
                        onPause={pauseTimer}
                        onReset={resetTimer}
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            ) : (
              <Alert className="min-h-40 items-center p-6">
                <ListChecks aria-hidden="true" />
                <AlertTitle>{t("No instruction steps yet")}</AlertTitle>
                <AlertDescription>
                  {t(
                    "Exit cooking mode and add steps before starting this recipe.",
                  )}
                </AlertDescription>
              </Alert>
            )}

            {recipe.steps.length > 0 ? (
              <div className="hidden items-center justify-between gap-3 sm:flex">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12 min-w-32"
                  onClick={() => goToStep(currentStepIndex - 1)}
                  disabled={currentStepIndex === 0}
                >
                  <ChevronLeft aria-hidden="true" /> {t("Previous")}
                </Button>
                {currentStepIndex === recipe.steps.length - 1 ? (
                  <Button
                    type="button"
                    className="min-h-12 min-w-40"
                    onClick={completeRecipe}
                    disabled={isPending}
                  >
                    <CircleCheckBig aria-hidden="true" />{" "}
                    {t(isPending ? "Finishing…" : "Finish cooking")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="min-h-12 min-w-32"
                    onClick={() => goToStep(currentStepIndex + 1)}
                  >
                    {t("Next")} <ChevronRight aria-hidden="true" />
                  </Button>
                )}
              </div>
            ) : null}

            {completionError ? (
              <Alert variant="destructive">
                <AlertTitle>{t("Cooking history was not updated")}</AlertTitle>
                <AlertDescription>
                  {completionError} {t("Your cooking session is still here.")}
                </AlertDescription>
              </Alert>
            ) : null}

            <section
              className="border-border/80 bg-card/75 rounded-2xl border p-4 sm:p-5"
              aria-labelledby="all-steps-title"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 id="all-steps-title" className="font-semibold">
                    {t("All steps")}
                  </h2>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {t("Scan ahead or start another timer.")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  aria-expanded={showFullList}
                  aria-controls="full-instruction-list"
                  onClick={() => setShowFullList((visible) => !visible)}
                >
                  <ListChecks aria-hidden="true" />{" "}
                  {t(showFullList ? "Hide" : "Show")}
                </Button>
              </div>
              {showFullList ? (
                <div id="full-instruction-list">
                  <FullStepList
                    steps={recipe.steps}
                    currentStepIndex={currentStepIndex}
                    timers={timers}
                    onSelectStep={goToStep}
                    onStartTimer={startTimer}
                    onPauseTimer={pauseTimer}
                  />
                </div>
              ) : null}
            </section>
          </div>

          <CookingTools
            recipe={recipe}
            checkedIds={checkedIds}
            activeTimers={activeTimers}
            notificationState={notificationState}
            toggleIngredient={toggleIngredient}
            startTimer={startTimer}
            pauseTimer={pauseTimer}
            resetTimer={resetTimer}
            requestNotifications={requestNotifications}
          />
        </div>
      </main>

      {recipe.steps.length > 0 ? (
        <nav
          className="safe-bottom safe-inline border-border/80 bg-surface/94 fixed inset-x-0 bottom-0 z-40 border-t pt-3 shadow-[0_-16px_45px_var(--shadow)] backdrop-blur-xl sm:hidden"
          aria-label={t("Cooking step controls")}
        >
          <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              onClick={() => goToStep(currentStepIndex - 1)}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft aria-hidden="true" /> {t("Back")}
            </Button>
            <span className="text-muted-foreground min-w-14 text-center font-mono text-xs tabular-nums">
              {formatNumber(currentStepIndex + 1)} /{" "}
              {formatNumber(recipe.steps.length)}
            </span>
            {currentStepIndex === recipe.steps.length - 1 ? (
              <Button
                type="button"
                className="min-h-12"
                onClick={completeRecipe}
                disabled={isPending}
              >
                <CircleCheckBig aria-hidden="true" />{" "}
                {t(isPending ? "Saving" : "Finish")}
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-12"
                onClick={() => goToStep(currentStepIndex + 1)}
              >
                {t("Next")} <ChevronRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
