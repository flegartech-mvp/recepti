"use client";

import { Check } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { THEME_CHOICES, type AppTheme } from "@/lib/theme";

export function ThemeSelector({
  value,
  onChange,
}: {
  value: AppTheme;
  onChange: (theme: AppTheme) => void;
}) {
  const { t } = useI18n();

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm font-semibold">{t("Color theme")}</legend>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Choose a calm garden palette or Nana's rose-inspired palette.")}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {THEME_CHOICES.map((choice) => {
          const selected = choice.value === value;
          return (
            <button
              key={choice.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(choice.value)}
              className={cn(
                "group min-h-32 rounded-xl border bg-card p-3 text-left transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/55 focus-visible:ring-3 focus-visible:ring-ring",
                selected
                  ? "border-primary shadow-[0_0_0_2px_var(--primary-soft),0_10px_24px_var(--shadow)]"
                  : "border-border",
              )}
            >
              <span
                className={cn(
                  "theme-preview block h-14 overflow-hidden rounded-lg border",
                  choice.previewClassName,
                )}
                aria-hidden="true"
              >
                <span className="theme-preview-sidebar" />
                <span className="theme-preview-card">
                  <span />
                  <span />
                </span>
              </span>
              <span className="mt-3 flex items-center justify-between gap-2 font-semibold">
                {t(choice.label)}
                {selected ? (
                  <Check className="size-4 text-primary-text" aria-hidden />
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {t(choice.description)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
