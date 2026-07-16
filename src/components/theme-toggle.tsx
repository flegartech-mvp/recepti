"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientSnapshot,
    getServerSnapshot,
  );

  const label = mounted
    ? resolvedTheme === "dark"
      ? t("Switch to light mode")
      : t("Switch to dark mode")
    : t("Switch color theme");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "relative size-11 overflow-hidden border border-border/80 bg-surface-secondary/70 text-primary-text shadow-sm hover:border-primary/55 hover:bg-primary-soft",
            className,
          )}
          aria-label={label}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun
            aria-hidden="true"
            className="absolute size-[1.1rem] rotate-0 scale-100 opacity-100 transition-[transform,opacity] duration-200 dark:-rotate-90 dark:scale-75 dark:opacity-0"
          />
          <Moon
            aria-hidden="true"
            className="absolute size-[1.1rem] rotate-90 scale-75 opacity-0 transition-[transform,opacity] duration-200 dark:rotate-0 dark:scale-100 dark:opacity-100"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}
