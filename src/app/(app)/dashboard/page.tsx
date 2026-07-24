import Link from "next/link";
import {
  BookOpenText,
  ChefHat,
  Heart,
  Plus,
  Refrigerator,
  Shuffle,
  Sparkles,
  Store,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { RecipeCard } from "@/features/recipes/components/recipe-card";
import { getDashboardData } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Dashboard") };
}

export default async function DashboardPage() {
  const { t, formatNumber } = await getServerI18n();
  const data = await getDashboardData();
  const surprise =
    data.recentRecipes.length > 0
      ? data.recentRecipes[data.favoriteCount % data.recentRecipes.length]
      : null;

  return (
    <PageContainer className="space-y-8 xl:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-[linear-gradient(125deg,var(--surface),var(--surface-secondary))] p-6 shadow-[0_18px_46px_var(--shadow)] sm:p-9 lg:p-11">
        <div
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-primary-soft/70 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-xs font-semibold tracking-wide text-primary-text">
              <Sparkles className="size-3.5" aria-hidden="true" />
              {t("Nana's private kitchen")}
            </span>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-none tracking-[-0.045em] sm:text-5xl lg:text-6xl">
              Hi, Nana
            </h1>
            <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
              {t("What are we cooking today?")}
            </p>
          </div>
          <Link
            href="/recipes/new"
            className={buttonVariants({
              size: "lg",
              className: "w-full sm:w-auto",
            })}
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("Add recipe")}
          </Link>
        </div>
      </section>

      <section
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-[0_10px_28px_var(--shadow)] xl:grid-cols-4"
        aria-label={t("Cookbook overview")}
      >
        <MetricCard
          label={t("Recipes")}
          value={formatNumber(data.recipeCount)}
          icon={BookOpenText}
          note={t("Saved in your cookbook")}
        />
        <MetricCard
          label={t("Favorites")}
          value={formatNumber(data.favoriteCount)}
          icon={Heart}
          note={t("The ones worth repeating")}
        />
        <MetricCard
          label={t("Pantry items")}
          value={formatNumber(data.pantryCount)}
          icon={Refrigerator}
          note={t("Currently available at home")}
        />
        <MetricCard
          label={t("Ready now")}
          value={formatNumber(data.makeableCount)}
          icon={ChefHat}
          note={t("Complete pantry matches")}
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.45fr_0.55fr]">
        <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary-soft/70 p-6 shadow-[0_10px_28px_var(--shadow)] sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ChefHat className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-7 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("Cook with what is already home")}
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
            {t(
              "Compare every saved recipe with what is in the pantry, then see exactly what is missing.",
            )}
          </p>
          <Link
            href="/cook-with-what-i-have"
            className={buttonVariants({
              variant: "secondary",
              className: "mt-7 bg-card/80",
            })}
          >
            {t("Find a recipe")}
            <ChefHat className="size-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-[0_10px_28px_var(--shadow)] backdrop-blur-sm">
          <h2 className="font-semibold">{t("Quick actions")}</h2>
          <div className="mt-5 grid gap-2">
            <Link
              href="/pantry?add=1"
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
            >
              <Refrigerator className="size-4" aria-hidden="true" />
              {t("Add pantry ingredient")}
            </Link>
            <Link
              href="/products"
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
            >
              <Store className="size-4" aria-hidden="true" />
              {t("Find grocery products")}
            </Link>
            {surprise ? (
              <Link
                href={`/recipes/${surprise.id}`}
                className={buttonVariants({
                  variant: "ghost",
                  className: "justify-start",
                })}
              >
                <Shuffle className="size-4" aria-hidden="true" />
                {t("Surprise me")}
              </Link>
            ) : (
              <span
                className={buttonVariants({
                  variant: "ghost",
                  className: "pointer-events-none justify-start opacity-50",
                })}
                aria-disabled="true"
              >
                <Shuffle className="size-4" aria-hidden="true" />
                {t("Surprise me")}
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-5" aria-labelledby="recent-recipes-title">
        <div className="flex items-center justify-between gap-4">
          <h2
            id="recent-recipes-title"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("Recently added")}
          </h2>
          {data.recentRecipes.length > 0 ? (
            <Link
              href="/recipes"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("View all")}
            </Link>
          ) : null}
        </div>
        {data.recentRecipes.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {data.recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={BookOpenText}
            title={t("Your recipe shelf is ready")}
            description={t(
              "Add the first trusted recipe and it will appear here for Nana.",
            )}
            actionLabel={t("Add recipe")}
            actionHref="/recipes/new"
          />
        )}
      </section>

      {data.recentlyCooked.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("Cooked lately")}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {data.recentlyCooked.slice(0, 4).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} compact />
            ))}
          </div>
        </section>
      ) : null}
    </PageContainer>
  );
}
