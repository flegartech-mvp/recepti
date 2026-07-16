import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChefHat,
  Clock3,
  History,
  Soup,
  UsersRound,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { RecipeDetailControls } from "@/features/recipes/components/recipe-detail-controls";
import { matchRecipe } from "@/lib/domain";
import { getRecipe, listPantry } from "@/lib/data/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  return {
    title: recipe?.title ?? "Recipe",
    description: "Private recipe in Nana's Recipes",
    robots: { index: false, follow: false },
  };
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [recipe, pantry] = await Promise.all([getRecipe(id), listPantry()]);
  if (!recipe) notFound();
  const match = matchRecipe(recipe, pantry);

  return (
    <PageContainer className="max-w-6xl">
      <article className="space-y-8">
        <header className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[linear-gradient(145deg,var(--mint-soft),color-mix(in_oklab,var(--peach)_50%,var(--background)))]">
            {recipe.imageUrl ? (
              <Image
                src={recipe.imageUrl}
                alt={`Cover for ${recipe.title}`}
                fill
                priority
                sizes="(max-width: 1024px) 94vw, 48vw"
                className="object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-forest/40">
                <Soup
                  className="size-20"
                  strokeWidth={1.2}
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <div>
            <div className="flex flex-wrap gap-2">
              {recipe.status === "draft" && (
                <Badge variant="outline">Draft</Badge>
              )}
              <Badge variant="secondary" className="capitalize">
                {recipe.category}
              </Badge>
              {recipe.cuisine && (
                <Badge variant="secondary">{recipe.cuisine}</Badge>
              )}
              {recipe.dietaryTags.map((tag) => (
                <Badge key={`dietary-${tag}`} variant="outline">
                  {tag}
                </Badge>
              ))}
              {recipe.customTags.map((tag) => (
                <Badge key={`custom-${tag}`} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
            <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl">
              {recipe.title}
            </h1>
            {recipe.description && (
              <p className="mt-5 max-w-[55ch] text-lg leading-relaxed text-muted-foreground">
                {recipe.description}
              </p>
            )}
            <dl className="mt-7 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-3 xl:grid-cols-4">
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  Prep
                </dt>
                <dd className="mt-1 font-semibold">{recipe.prepMinutes} min</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  Cook
                </dt>
                <dd className="mt-1 font-semibold">{recipe.cookMinutes} min</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  Rest
                </dt>
                <dd className="mt-1 font-semibold">{recipe.restMinutes} min</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  Total
                </dt>
                <dd className="mt-1 font-semibold">
                  {recipe.totalMinutes} min
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UsersRound className="size-3.5" />
                  Serves
                </dt>
                <dd className="mt-1 font-semibold">{recipe.servings}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ChefHat className="size-3.5" />
                  Difficulty
                </dt>
                <dd className="mt-1 font-semibold capitalize">
                  {recipe.difficulty}
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <History className="size-3.5" />
                  Cooked
                </dt>
                <dd className="mt-1 font-semibold">
                  {recipe.cookedCount} times
                </dd>
              </div>
            </dl>
          </div>
        </header>

        <RecipeDetailControls recipe={recipe} match={match} />

        <section
          className="rounded-2xl border border-border bg-card p-5 sm:p-7"
          aria-labelledby="steps-heading"
        >
          <h2
            id="steps-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Method
          </h2>
          <ol className="mt-6 space-y-6">
            {recipe.steps.map((step, index) => (
              <li
                key={step.id}
                className="print-keep grid gap-4 sm:grid-cols-[2.75rem_1fr]"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div className="pt-1">
                  <p className="leading-relaxed">{step.instruction}</p>
                  {step.timerSeconds && (
                    <p className="mt-2 text-sm font-medium text-primary">
                      Timer: {Math.round(step.timerSeconds / 60)} minutes
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {(recipe.notes || recipe.sourceName || recipe.sourceUrl) && (
          <section className="grid gap-5 sm:grid-cols-2">
            {recipe.notes && (
              <div className="rounded-2xl bg-mint-soft p-6 text-forest">
                <h2 className="font-semibold">Personal notes</h2>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-forest/80">
                  {recipe.notes}
                </p>
              </div>
            )}
            {(recipe.sourceName || recipe.sourceUrl) && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold">Source</h2>
                <p className="mt-3 text-muted-foreground">
                  {recipe.sourceUrl ? (
                    <Link
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      {recipe.sourceName ?? "Open original source"}
                    </Link>
                  ) : (
                    recipe.sourceName
                  )}
                </p>
              </div>
            )}
          </section>
        )}

        <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            Created{" "}
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(recipe.createdAt),
            )}
          </span>
          <span>
            Updated{" "}
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(recipe.updatedAt),
            )}
          </span>
          {recipe.lastCookedAt && (
            <span>
              Last cooked{" "}
              {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                new Date(recipe.lastCookedAt),
              )}
            </span>
          )}
        </footer>
      </article>
    </PageContainer>
  );
}
