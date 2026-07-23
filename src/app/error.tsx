"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  return (
    <main className="safe-inline grid min-h-[60dvh] place-items-center py-12">
      <div className="safe-top-control fixed z-20 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="max-w-md space-y-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {t("Something did not load")}
          </h1>
          <p className="text-muted-foreground">
            {t("Your cookbook data was not changed. Try the request again.")}
          </p>
        </div>
        <Button onClick={reset}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("Try again")}
        </Button>
      </div>
    </main>
  );
}
