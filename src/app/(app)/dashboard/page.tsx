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
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { RecipeCard } from "@/features/recipes/components/recipe-card";
import { getDashboardData } from "@/lib/data/queries";
import { getServerI18n } from "@/lib/i18n/server";
export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("Dashboard") };
}
function greeting(locale: string) {
  const hour = Number(
    new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      hour12: false,
      timeZone: "Europe/Ljubljana",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "hour")?.value ?? 12,
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
const cookingMessages = [
  "A favorite recipe is a small shortcut back home.",
  "Check the pantry first. Dinner may already be waiting.",
  "Taste as you go and keep the notes that matter.",
  "Simple ingredients are allowed to be the whole idea.",
];
export default async function DashboardPage() {
  const { locale, t, formatNumber } = await getServerI18n();
  const data = await getDashboardData();
  const message = cookingMessages[data.recipeCount % cookingMessages.length];
  const surprise =
    data.recentRecipes.length > 0
      ? data.recentRecipes[data.favoriteCount % data.recentRecipes.length]
      : null;
  return (
    <PageContainer>
      {" "}
      <PageHeader
        title={t("{greeting}, cook.", { greeting: t(greeting(locale)) })}
        description={t(message)}
        action={
          <Link href="/recipes/new" className={buttonVariants()}>
            <Plus className="size-4" aria-hidden="true" />
            {t("Add recipe")}
          </Link>
        }
      />{" "}
      <section
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-[0_10px_28px_var(--shadow)] xl:grid-cols-4"
        aria-label={t("Cookbook overview")}
      >
        {" "}
        <MetricCard
          label={t("Recipes")}
          value={formatNumber(data.recipeCount)}
          icon={BookOpenText}
          note={t("Saved in your cookbook")}
        />{" "}
        <MetricCard
          label={t("Favorites")}
          value={formatNumber(data.favoriteCount)}
          icon={Heart}
          note={t("The ones worth repeating")}
        />{" "}
        <MetricCard
          label={t("Pantry items")}
          value={formatNumber(data.pantryCount)}
          icon={Refrigerator}
          note={t("Currently available at home")}
        />{" "}
        <MetricCard
          label={t("Ready now")}
          value={formatNumber(data.makeableCount)}
          icon={ChefHat}
          note={t("Complete pantry matches")}
        />{" "}
      </section>{" "}
      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        {" "}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-surface-secondary p-6 text-foreground shadow-[0_10px_28px_var(--shadow)] sm:p-8">
          {" "}
          <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-text">
            {" "}
            <Sparkles className="size-6" aria-hidden="true" />{" "}
          </span>{" "}
          <h2 className="mt-8 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
            {" "}
            {t("What can I cook today?")}{" "}
          </h2>{" "}
          <p className="mt-3 max-w-xl text-muted-foreground">
            {" "}
            {t(
              "Compare every saved recipe with what is in the pantry, then see exactly what is missing.",
            )}{" "}
          </p>{" "}
          <Link
            href="/cook-with-what-i-have"
            className={buttonVariants({
              variant: "secondary",
              className: "mt-7",
            })}
          >
            {t("Find a recipe")}
            <ChefHat className="size-4" aria-hidden="true" />
          </Link>{" "}
        </div>{" "}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_10px_28px_var(--shadow)]">
          {" "}
          <h2 className="font-semibold">{t("Quick actions")}</h2>{" "}
          <div className="mt-5 grid gap-2">
            {" "}
            <Link
              href="/pantry?add=1"
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
            >
              <Refrigerator className="size-4" aria-hidden="true" />
              {t("Add pantry ingredient")}
            </Link>{" "}
            <Link
              href="/products"
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
            >
              <Store className="size-4" aria-hidden="true" />
              {t("Find grocery products")}
            </Link>{" "}
            <Link
              href="/shopping-list"
              className={buttonVariants({
                variant: "ghost",
                className: "justify-start",
              })}
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("Open shopping list")}
            </Link>{" "}
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
            )}{" "}
          </div>{" "}
        </div>{" "}
      </section>{" "}
      {data.recentRecipes.length > 0 && (
        <section className="space-y-5">
          {" "}
          <div className="flex items-center justify-between gap-4">
            {" "}
            <h2 className="text-2xl font-semibold tracking-tight">
              {" "}
              {t("Recently added")}{" "}
            </h2>{" "}
            <Link
              href="/recipes"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("View all")}
            </Link>{" "}
          </div>{" "}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {" "}
            {data.recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}{" "}
          </div>{" "}
        </section>
      )}{" "}
      {data.recentlyCooked.length > 0 && (
        <section className="space-y-4">
          {" "}
          <h2 className="text-xl font-semibold tracking-tight">
            {" "}
            {t("Cooked lately")}{" "}
          </h2>{" "}
          <div className="grid gap-3 md:grid-cols-2">
            {" "}
            {data.recentlyCooked.slice(0, 4).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} compact />
            ))}{" "}
          </div>{" "}
        </section>
      )}{" "}
    </PageContainer>
  );
}
