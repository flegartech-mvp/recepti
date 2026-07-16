"use client";

import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      className={cn(
        "inline-flex h-11 items-center rounded-lg border border-border/80 bg-surface-secondary/70 p-1 shadow-sm",
        className,
      )}
      role="group"
      aria-label={t("Language selection")}
    >
      {(["en", "sl"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          aria-label={t(
            value === "en"
              ? "Switch language to English"
              : "Switch language to Slovenian",
          )}
          className={cn(
            "grid min-h-9 min-w-10 place-items-center rounded-md px-2 text-xs font-bold tracking-wide transition-colors focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none",
            locale === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
