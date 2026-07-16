import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BookOpenText,
  LogIn,
  Refrigerator,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth/actions";
import { getAuthorizationState } from "@/lib/auth/authorization";
import { safeInternalPath } from "@/lib/auth/redirects";
import { getServerI18n } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [state, parameters] = await Promise.all([
    getAuthorizationState(),
    searchParams,
  ]);
  if (state.status === "owner") redirect("/dashboard");
  if (state.status === "denied") redirect("/private");

  const nextPath = safeInternalPath(parameters.next);
  const { t } = await getServerI18n();

  return (
    <main className="min-h-[100dvh] overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_8%,color-mix(in_srgb,var(--primary-soft)_62%,transparent),transparent_34rem)]" />

      <nav
        className="safe-landing-header safe-inline mx-auto flex w-full max-w-7xl items-center justify-between"
        aria-label={t("Public navigation")}
      >
        <Logo />
        <div className="flex items-center gap-3">
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
            {t("Private by design")}
          </span>
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>

      <section className="safe-inline mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-7xl items-center gap-10 pb-14 pt-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:pb-20 lg:pt-8">
        <div className="max-w-xl">
          <h1 className="text-balance text-4xl font-semibold leading-[1.03] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
            {t("A cookbook that knows what's at home.")}
          </h1>
          <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t(
              "Save every favorite, keep the pantry close, and find dinner without the usual guesswork.",
            )}
          </p>
          <form action={signInWithGoogle} className="mt-8">
            <input type="hidden" name="next" value={nextPath} />
            <Button
              size="lg"
              className="h-13 min-w-56 px-6 text-base shadow-lg shadow-primary/15"
            >
              <LogIn className="size-5" aria-hidden="true" />
              {t("Continue with Google")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </form>
          {!state.configured && (
            <Alert className="mt-6 max-w-lg border-notice bg-notice/40">
              <AlertTitle>{t("Finish Google sign-in setup")}</AlertTitle>
              <AlertDescription>
                {t(
                  "This copy has no Supabase connection yet. Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and OWNER_EMAIL in .env.local, then enable Google in Supabase Auth.",
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-[590px] lg:justify-self-end">
          <div className="organic-shadow relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface-tint">
            <Image
              src="/images/menta-hero.png"
              alt={t(
                "Fresh herb pasta beside a mint ceramic bowl, basil, and a recipe notebook",
              )}
              fill
              priority
              sizes="(max-width: 1024px) 92vw, 46vw"
              className="object-cover"
            />
          </div>
          <div className="surface-shadow absolute -bottom-5 -left-3 hidden w-64 rounded-xl border border-border bg-card p-4 sm:block lg:-left-8">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <p className="text-sm leading-relaxed">
                <strong className="block text-foreground">
                  {t("Dinner, made simpler")}
                </strong>
                <span className="text-muted-foreground">
                  {t("Nana's Recipes compares saved recipes with the pantry.")}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-border/70 bg-surface/72"
        aria-labelledby="landing-features"
      >
        <div className="safe-inline mx-auto grid w-full max-w-7xl gap-5 py-16 md:grid-cols-2 lg:grid-cols-[1.35fr_0.65fr] lg:py-20">
          <div className="rounded-2xl border border-border bg-surface-secondary p-7 text-foreground shadow-[0_10px_30px_var(--shadow)] sm:p-9">
            <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-text">
              <BookOpenText className="size-6" aria-hidden="true" />
            </span>
            <h2
              id="landing-features"
              className="mt-8 max-w-md text-3xl font-semibold tracking-tight sm:text-4xl"
            >
              {t("Every trusted recipe, thoughtfully kept.")}
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              {t(
                "Ingredients, ordered steps, notes, favorites, cooking history, and images stay together in one calm private space.",
              )}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_8px_24px_var(--shadow)]">
              <Refrigerator
                className="size-6 text-primary-text"
                aria-hidden="true"
              />
              <h3 className="mt-6 text-lg font-semibold">
                {t("A pantry with a purpose")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("Track what is fresh, low, expiring, or ready to use.")}
              </p>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary-soft p-6 text-foreground">
              <Sparkles className="size-6" aria-hidden="true" />
              <h3 className="mt-6 text-lg font-semibold">
                {t("A clear answer for tonight")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">
                {t(
                  "See complete matches first, then honest missing-ingredient details.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
