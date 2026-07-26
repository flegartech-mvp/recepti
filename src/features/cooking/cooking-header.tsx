"use client";

import Link from "next/link";
import { ArrowLeft, ChefHat, MonitorUp } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

import type { WakeLockStatus } from "./use-wake-lock";

function wakeLockCopy(status: WakeLockStatus) {
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

export function CookingHeader({
  recipeId,
  title,
  wakeLockStatus,
  requestWakeLock,
}: {
  recipeId: string;
  title: string;
  wakeLockStatus: WakeLockStatus;
  requestWakeLock: () => Promise<void>;
}) {
  const { t } = useI18n();
  const copy = wakeLockCopy(wakeLockStatus);
  return (
    <header className="safe-top border-border/70 bg-surface/92 sticky top-0 z-40 border-b shadow-sm backdrop-blur-xl">
      <div className="safe-inline mx-auto flex min-h-16 max-w-7xl items-center gap-3">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="size-11"
          aria-label={t("Exit cooking mode")}
        >
          <Link href={`/recipes/${recipeId}`}>
            <ArrowLeft aria-hidden="true" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ChefHat className="text-primary-text size-4" aria-hidden="true" />
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.15em] uppercase">
              {t("Cooking mode")}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-tight font-semibold [overflow-wrap:anywhere] sm:text-base">
            {title}
          </p>
        </div>
        <LanguageSwitcher />
        <ThemeToggle />
        <Button
          type="button"
          variant={wakeLockStatus === "active" ? "secondary" : "ghost"}
          className="min-h-11 px-3"
          onClick={() => void requestWakeLock()}
          disabled={
            wakeLockStatus === "requesting" || wakeLockStatus === "unsupported"
          }
          aria-label={t(copy.description)}
          title={t(copy.description)}
        >
          <MonitorUp aria-hidden="true" />
          <span className="hidden sm:inline">{t(copy.label)}</span>
        </Button>
      </div>
    </header>
  );
}
