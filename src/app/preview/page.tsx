import { BookOpenText, Clock3, LockKeyhole, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthorizationState } from "@/lib/auth/authorization";
import { demoRecipes } from "@/lib/data/demo";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function PreviewPage() {
  const [state, { t }] = await Promise.all([
    getAuthorizationState(),
    getServerI18n(),
  ]);

  if (state.status === "owner") redirect("/dashboard");
  if (state.status === "denied") redirect("/private");

  return (
    <main className="min-h-[100dvh] bg-surface-secondary/45 pb-14">
      <nav
        className="safe-landing-header safe-inline mx-auto flex w-full max-w-7xl items-center justify-between"
        aria-label={t("Public navigation")}
      >
        <Logo />
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{t("Guest preview")}</Badge>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>

      <div className="safe-inline mx-auto w-full max-w-7xl py-8 sm:py-12">
        <section className="rounded-2xl border border-primary/20 bg-primary-soft p-6 shadow-[0_12px_32px_var(--shadow)] sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("Guest preview")}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-foreground/75 sm:text-lg">
                {t(
                  "You are viewing sample recipes. Only the cookbook owner can see or change private data.",
                )}
              </p>
            </div>
            <Button asChild variant="outline" className="bg-card">
              <Link href="/">{t("Back to home")}</Link>
            </Button>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="sample-recipes">
          <div className="mb-5 flex items-center gap-3">
            <BookOpenText
              className="size-6 text-primary-text"
              aria-hidden="true"
            />
            <h2
              id="sample-recipes"
              className="text-2xl font-semibold tracking-tight"
            >
              {t("Sample recipes")}
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {demoRecipes.slice(0, 3).map((recipe) => (
              <Card key={recipe.id} className="gap-0">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="outline">{t("Preview only")}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" aria-hidden="true" />
                      {recipe.totalMinutes} min
                    </span>
                  </div>
                  <CardTitle className="mt-4 text-xl">{recipe.title}</CardTitle>
                  <CardDescription>{recipe.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-muted-foreground">
                    {recipe.ingredients.length} ingredients · {recipe.servings}{" "}
                    servings
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mt-10 flex items-start gap-3 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <LockKeyhole
            className="mt-0.5 size-5 shrink-0 text-primary-text"
            aria-hidden="true"
          />
          <p>{t("Private cookbook data is never shown here.")}</p>
        </section>
      </div>
    </main>
  );
}
