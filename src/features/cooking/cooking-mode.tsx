"use client";

import {
  ArrowLeft,
  Bell,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Clock3,
  ListChecks,
  MonitorUp,
  Timer as TimerIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { markRecipeCookedAction } from "@/features/recipes/actions";
import type { Recipe } from "@/types/domain";

import { formatTimer } from "./cooking-format";
import { FullStepList } from "./full-step-list";
import { IngredientChecklist } from "./ingredient-checklist";
import { TimerControls } from "./timer-controls";
import { type CookingTimer, useCookingSession } from "./use-cooking-session";
import { type WakeLockStatus, useWakeLock } from "./use-wake-lock";

interface CookingModeProps {
  recipe: Recipe;
}

type NotificationState = NotificationPermission | "unsupported";

function wakeLockCopy(status: WakeLockStatus): {
  label: string;
  description: string;
} {
  if (status === "active")
    return {
      label: "Screen awake",
      description: "Screen sleep is being prevented",
    };
  if (status === "requesting")
    return {
      label: "Keeping awake",
      description: "Requesting screen wake lock",
    };
  if (status === "unsupported")
    return {
      label: "Wake unavailable",
      description: "This browser does not support screen wake lock",
    };
  return {
    label: "Keep screen awake",
    description: "Tap to retry the screen wake lock",
  };
}

export function CookingMode({ recipe }: CookingModeProps) {
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
        const message = `${timer.label} timer is finished.`;
        setTimerAnnouncement(message);
        if (
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          try {
            new window.Notification(`${timer.label} is done`, {
              body: `${recipe.title} is ready for the next move.`,
              tag: `menta-timer-${recipe.id}-${timer.stepId}`,
            });
          } catch {
            // The visible timer and live-region announcement remain the fallback.
          }
        }
      }
      previous.set(timer.stepId, timer.status);
    }
  }, [recipe.id, recipe.title, timers]);

  const currentStep = recipe.steps[currentStepIndex];
  const currentTimer = currentStep
    ? timers.find((timer) => timer.stepId === currentStep.id)
    : undefined;
  const activeTimers = timers.filter((timer) => timer.status !== "idle");
  const checkedIds = useMemo(
    () => new Set(checkedIngredientIds),
    [checkedIngredientIds],
  );
  const progress =
    recipe.steps.length > 0
      ? ((currentStepIndex + 1) / recipe.steps.length) * 100
      : 0;
  const wakeCopy = wakeLockCopy(wakeLockStatus);

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
        setCompletionError(result.message);
        return;
      }
      finishSession();
      setIsComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [finishSession, recipe.id, recipe.servings]);

  if (isComplete) {
    return (
      <main className="grid min-h-dvh place-items-center px-5 py-12">
        <section className="organic-shadow bg-card border-border/80 w-full max-w-xl rounded-3xl border p-7 text-center sm:p-12">
          <div className="bg-accent text-primary mx-auto grid size-16 place-items-center rounded-full">
            <CircleCheckBig className="size-8" aria-hidden="true" />
          </div>
          <p className="text-primary mt-6 text-sm font-semibold tracking-[0.16em] uppercase">
            Cooked with Nana&apos;s Recipes
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Dinner is served.
          </h1>
          <p className="text-muted-foreground mx-auto mt-3 max-w-md leading-7">
            {recipe.title} has been added to your cooking history. The kitchen
            session was cleared for next time.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="min-h-12 px-5">
              <Link href={`/recipes/${recipe.id}`}>Back to recipe</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-12 px-5">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--mint-soft)_45%,transparent),transparent_36%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--background)_88%,var(--peach)))]">
      <p className="sr-only" aria-live="assertive" aria-atomic="true">
        {timerAnnouncement}
      </p>

      <header className="border-border/70 bg-background/88 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Exit cooking mode"
          >
            <Link href={`/recipes/${recipe.id}`}>
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ChefHat className="text-primary size-4" aria-hidden="true" />
              <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">
                Cooking mode
              </span>
            </div>
            <p className="truncate text-sm font-semibold sm:text-base">
              {recipe.title}
            </p>
          </div>
          <Button
            type="button"
            variant={wakeLockStatus === "active" ? "secondary" : "ghost"}
            className="min-h-11 px-3"
            onClick={() => void requestWakeLock()}
            disabled={
              wakeLockStatus === "requesting" ||
              wakeLockStatus === "unsupported"
            }
            aria-label={wakeCopy.description}
            title={wakeCopy.description}
          >
            <MonitorUp aria-hidden="true" />
            <span className="hidden sm:inline">{wakeCopy.label}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pt-6 pb-32 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] xl:gap-8">
          <div className="min-w-0 space-y-5">
            <section aria-labelledby="cooking-progress-title" className="px-1">
              <div className="mb-2 flex items-end justify-between gap-4">
                <div>
                  <p
                    id="cooking-progress-title"
                    className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase"
                  >
                    Recipe progress
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {recipe.steps.length > 0
                      ? `Step ${currentStepIndex + 1} of ${recipe.steps.length}`
                      : "No steps yet"}
                  </p>
                </div>
                <span className="text-muted-foreground font-mono text-sm tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>
              <Progress
                value={progress}
                className="h-2"
                aria-label={`Recipe is ${Math.round(progress)}% through its steps`}
              />
            </section>

            {currentStep ? (
              <article
                ref={stepCardRef}
                className="organic-shadow bg-card border-border/80 scroll-mt-24 overflow-hidden rounded-3xl border"
              >
                <div className="border-border/70 flex items-center justify-between gap-3 border-b px-5 py-4 sm:px-8">
                  <span className="bg-peach text-forest rounded-full px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase">
                    Step {currentStepIndex + 1}
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
                <AlertTitle>No instruction steps yet</AlertTitle>
                <AlertDescription>
                  Exit cooking mode and add steps before starting this recipe.
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
                  <ChevronLeft aria-hidden="true" /> Previous
                </Button>
                {currentStepIndex === recipe.steps.length - 1 ? (
                  <Button
                    type="button"
                    className="min-h-12 min-w-40"
                    onClick={completeRecipe}
                    disabled={isPending}
                  >
                    <CircleCheckBig aria-hidden="true" />{" "}
                    {isPending ? "Finishing…" : "Finish cooking"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="min-h-12 min-w-32"
                    onClick={() => goToStep(currentStepIndex + 1)}
                  >
                    Next <ChevronRight aria-hidden="true" />
                  </Button>
                )}
              </div>
            ) : null}

            {completionError ? (
              <Alert variant="destructive">
                <AlertTitle>Cooking history was not updated</AlertTitle>
                <AlertDescription>
                  {completionError} Your cooking session is still here.
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
                    All steps
                  </h2>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    Scan ahead or start another timer.
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
                  {showFullList ? "Hide" : "Show"}
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

          <aside
            className="space-y-5 lg:sticky lg:top-24"
            aria-label="Cooking tools"
          >
            <section
              className="bg-card border-border/80 rounded-2xl border p-4 sm:p-5"
              aria-labelledby="ingredient-checklist-title"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="ingredient-checklist-title" className="font-semibold">
                    Ingredients
                  </h2>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    {checkedIds.size} of {recipe.ingredients.length} prepared
                  </p>
                </div>
                <span className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 font-mono text-xs tabular-nums">
                  {recipe.servings} servings
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
                    Timers
                  </h2>
                  <p className="text-muted-foreground mt-0.5 text-sm">
                    Independent timers stay active between steps.
                  </p>
                </div>
                <TimerIcon
                  className="text-primary mt-0.5 size-5"
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
                  Start a step timer and it will appear here while you move
                  through the recipe.
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
                    ? "Notifications blocked in browser"
                    : "Enable timer notifications"}
                </Button>
              ) : null}
            </section>
          </aside>
        </div>
      </main>

      {recipe.steps.length > 0 ? (
        <nav
          className="border-border/80 bg-background/94 safe-bottom fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 shadow-[0_-16px_45px_color-mix(in_oklab,var(--forest)_10%,transparent)] backdrop-blur-xl sm:hidden"
          aria-label="Cooking step controls"
        >
          <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto_1fr] items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              onClick={() => goToStep(currentStepIndex - 1)}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft aria-hidden="true" /> Back
            </Button>
            <span className="text-muted-foreground min-w-14 text-center font-mono text-xs tabular-nums">
              {currentStepIndex + 1} / {recipe.steps.length}
            </span>
            {currentStepIndex === recipe.steps.length - 1 ? (
              <Button
                type="button"
                className="min-h-12"
                onClick={completeRecipe}
                disabled={isPending}
              >
                <CircleCheckBig aria-hidden="true" />{" "}
                {isPending ? "Saving" : "Finish"}
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-12"
                onClick={() => goToStep(currentStepIndex + 1)}
              >
                Next <ChevronRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
