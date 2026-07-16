"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import { formatTimer, timerStatusText } from "./cooking-format";
import type { CookingTimer } from "./use-cooking-session";

interface TimerControlsProps {
  timer: CookingTimer;
  compact?: boolean;
  onStart: (stepId: string) => void;
  onPause: (stepId: string) => void;
  onReset: (stepId: string) => void;
}

export function TimerControls({
  timer,
  compact = false,
  onStart,
  onPause,
  onReset,
}: TimerControlsProps) {
  const progress =
    timer.durationSeconds > 0
      ? ((timer.durationSeconds - timer.remainingSeconds) /
          timer.durationSeconds) *
        100
      : 0;
  const isRunning = timer.status === "running";

  return (
    <div
      className={cn(
        "border-border/80 bg-background/80 rounded-xl border",
        compact ? "p-3" : "p-4 sm:p-5",
        timer.status === "complete" && "border-primary/35 bg-accent/55",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
            {timer.label}
          </p>
          <p
            className={cn(
              "mt-1 font-mono font-semibold tabular-nums",
              compact ? "text-2xl" : "text-3xl sm:text-4xl",
              timer.status === "complete" && "text-primary-text",
            )}
            role="timer"
            aria-label={`${timer.label} timer, ${timerStatusText(timer)}, ${formatTimer(timer.remainingSeconds)} remaining`}
          >
            {timer.status === "complete"
              ? "Done"
              : formatTimer(timer.remainingSeconds)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium",
            timer.status === "running" && "bg-notice text-notice-foreground",
            timer.status === "paused" && "bg-muted text-muted-foreground",
            timer.status === "complete" && "bg-primary text-primary-foreground",
            timer.status === "idle" && "bg-secondary text-secondary-foreground",
          )}
        >
          {timerStatusText(timer)}
        </span>
      </div>

      <Progress
        value={progress}
        className="mt-3 h-1.5"
        aria-label={`${Math.round(progress)}% elapsed`}
      />

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant={isRunning ? "secondary" : "default"}
          className={cn("min-h-11 flex-1", !compact && "sm:min-h-12")}
          onClick={() =>
            isRunning ? onPause(timer.stepId) : onStart(timer.stepId)
          }
        >
          {isRunning ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
          {isRunning
            ? "Pause"
            : timer.status === "paused"
              ? "Resume"
              : timer.status === "complete"
                ? "Again"
                : "Start"}
        </Button>
        {timer.status !== "idle" ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={cn("size-11", !compact && "sm:size-12")}
            onClick={() => onReset(timer.stepId)}
            aria-label={`Reset ${timer.label.toLowerCase()} timer`}
          >
            <RotateCcw aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
