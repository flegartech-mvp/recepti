import { LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InteractiveDemo } from "@/features/demo/components/interactive-demo";
import { getAuthorizationState } from "@/lib/auth/authorization";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PreviewPage() {
  const [state, { t }] = await Promise.all([
    getAuthorizationState(),
    getServerI18n(),
  ]);

  if (state.status === "owner") redirect("/dashboard");
  if (state.status === "guest") redirect("/private");
  if (state.status === "denied") redirect("/private");

  return (
    <main className="min-h-[100dvh] bg-surface-secondary/45 pb-14">
      <nav
        className="safe-landing-header safe-inline mx-auto flex w-full max-w-7xl items-center justify-between"
        aria-label={t("Public navigation")}
      >
        <Logo href="/" />
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="hidden md:inline-flex">
            {t("Interactive demo")}
          </Badge>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>

      <div className="safe-inline mx-auto w-full max-w-7xl py-6 sm:py-9">
        <header className="mb-7 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-4xl lg:text-5xl">
              {t("Try the kitchen, not just the recipe cards.")}
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t(
                "Change the pantry, inspect live recipe matches, scale servings, cook step by step, run timers, and build a temporary list.",
              )}
            </p>
          </div>
          <Button asChild variant="outline" className="bg-card">
            <Link href="/">{t("Back to home")}</Link>
          </Button>
        </header>

        <InteractiveDemo />

        <footer className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <LockKeyhole
            className="mt-0.5 size-5 shrink-0 text-primary-text"
            aria-hidden="true"
          />
          <p>
            {t(
              "The demo never shows household cookbook data. Signed-in household members share one private cookbook.",
            )}
          </p>
        </footer>
      </div>
    </main>
  );
}
