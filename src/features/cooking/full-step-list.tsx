"use client";

import { Clock3, Pause, Play } from "lucide-react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RecipeStep } from "@/types/domain";

import { formatTimer } from "./cooking-format";
import type { CookingTimer } from "./use-cooking-session";

interface FullStepListProps {
  steps: readonly RecipeStep[];
  currentStepIndex: number;
  timers: readonly CookingTimer[];
  onSelectStep: (index: number) => void;
  onStartTimer: (stepId: string) => void;
  onPauseTimer: (stepId: string) => void;
}

export function FullStepList({
  steps,
  currentStepIndex,
  timers,
  onSelectStep,
  onStartTimer,
  onPauseTimer,
}: FullStepListProps) {
  const timerByStep = useMemo(
    () => new Map(timers.map((timer) => [timer.stepId, timer])),
    [timers],
  );

  return (
    <ol className="mt-4 space-y-2">
      {steps.map((step, index) => {
        const timer = timerByStep.get(step.id);
        const isCurrent = index === currentStepIndex;
        return (
          <li
            key={step.id}
            className={cn(
              "border-border bg-card rounded-xl border p-3 sm:p-4",
              isCurrent && "border-primary/45 bg-accent/35",
            )}
          >
            <button
              type="button"
              className="focus-visible:ring-ring/40 w-full rounded-lg text-left focus-visible:ring-2"
              onClick={() => onSelectStep(index)}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                Step {index + 1}
              </span>
              <span className="mt-1 block text-sm leading-6 sm:text-base">
                {step.instruction}
              </span>
            </button>
            {timer ? (
              <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-sm tabular-nums">
                  <Clock3 className="size-4" aria-hidden="true" />
                  {timer.status === "complete"
                    ? "Done"
                    : formatTimer(timer.remainingSeconds)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10"
                  onClick={() =>
                    timer.status === "running"
                      ? onPauseTimer(step.id)
                      : onStartTimer(step.id)
                  }
                >
                  {timer.status === "running" ? (
                    <Pause aria-hidden="true" />
                  ) : (
                    <Play aria-hidden="true" />
                  )}
                  {timer.status === "running"
                    ? "Pause"
                    : timer.status === "paused"
                      ? "Resume"
                      : "Start timer"}
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
