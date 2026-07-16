import Link from "next/link";
import {
  BookOpenText,
  ChefHat,
  Heart,
  Plus,
  Refrigerator,
  Shuffle,
  Sparkles,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/features/dashboard/components/metric-card";
import { RecipeCard } from "@/features/recipes/components/recipe-card";
import { getDashboardData } from "@/lib/data/queries";

export const metadata = { title: "Dashboard" };

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en", {
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
  const data = await getDashboardData();
  const message = cookingMessages[data.recipeCount % cookingMessages.length];
  const surprise =
    data.recentRecipes.length > 0
      ? data.recentRecipes[data.favoriteCount % data.recentRecipes.length]
      : null;

  return (
    <PageContainer>
      <PageHeader
        title={`${greeting()}, cook.`}
        description={message}
        action={
          <Button asChild>
            <Link href="/recipes/new">
              <Plus className="size-4" aria-hidden="true" />
              Add recipe
            </Link>
          </Button>
        }
      />

      <section
        className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border shadow-[0_10px_28px_var(--shadow)] xl:grid-cols-4"
        aria-label="Cookbook overview"
      >
        <MetricCard
          label="Recipes"
          value={data.recipeCount}
          icon={BookOpenText}
          note="Saved in your cookbook"
        />
        <MetricCard
          label="Favorites"
          value={data.favoriteCount}
          icon={Heart}
          note="The ones worth repeating"
        />
        <MetricCard
          label="Pantry items"
          value={data.pantryCount}
          icon={Refrigerator}
          note="Currently available at home"
        />
        <MetricCard
          label="Ready now"
          value={data.makeableCount}
          icon={ChefHat}
          note="Complete pantry matches"
        />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-surface-secondary p-6 text-foreground shadow-[0_10px_28px_var(--shadow)] sm:p-8">
          <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-text">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          <h2 className="mt-8 max-w-lg text-3xl font-semibold tracking-tight sm:text-4xl">
            What can I cook today?
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Compare every saved recipe with what is in the pantry, then see
            exactly what is missing.
          </p>
          <Button asChild variant="secondary" className="mt-7">
            <Link href="/cook-with-what-i-have">
              Find a recipe
              <ChefHat className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_10px_28px_var(--shadow)]">
          <h2 className="font-semibold">Quick actions</h2>
          <div className="mt-5 grid gap-2">
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/pantry?add=1">
                <Refrigerator className="size-4" aria-hidden="true" />
                Add pantry ingredient
              </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-start">
              <Link href="/shopping-list">
                <Plus className="size-4" aria-hidden="true" />
                Open shopping list
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="justify-start"
              disabled={!surprise}
            >
              <Link
                href={surprise ? `/recipes/${surprise.id}` : "/recipes/new"}
              >
                <Shuffle className="size-4" aria-hidden="true" />
                Surprise me
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {data.recentRecipes.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Recently added
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/recipes">View all</Link>
            </Button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {data.recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      )}

      {data.recentlyCooked.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Cooked lately
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {data.recentlyCooked.slice(0, 4).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} compact />
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  );
}
