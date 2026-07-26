"use client";

import { useI18n } from "@/components/i18n-provider";
import { Progress } from "@/components/ui/progress";

export function CookingProgress({
  currentStepIndex,
  stepCount,
}: {
  currentStepIndex: number;
  stepCount: number;
}) {
  const { t, formatNumber } = useI18n();
  const progress =
    stepCount > 0 ? ((currentStepIndex + 1) / stepCount) * 100 : 0;
  return (
    <section aria-labelledby="cooking-progress-title" className="px-1">
      <div className="mb-2 flex items-end justify-between gap-4">
        <div>
          <p
            id="cooking-progress-title"
            className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase"
          >
            {t("Recipe progress")}
          </p>
          <p className="mt-1 text-sm font-medium">
            {stepCount > 0
              ? t("Step {current} of {total}", {
                  current: formatNumber(currentStepIndex + 1),
                  total: formatNumber(stepCount),
                })
              : t("No steps yet")}
          </p>
        </div>
        <span className="text-muted-foreground font-mono text-sm tabular-nums">
          {formatNumber(Math.round(progress))}%
        </span>
      </div>
      <Progress
        value={progress}
        className="h-2"
        aria-label={t("Recipe is {percentage}% through its steps", {
          percentage: formatNumber(Math.round(progress)),
        })}
      />
    </section>
  );
}
