import Link from "next/link";
import { BookOpenText, Plus, SearchX } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/features/recipes/components/recipe-card";
import { RecipeFilters } from "@/features/recipes/components/recipe-filters";
import { getRecipeFilterOptions, listRecipes } from "@/lib/data/queries";

const validCategories = new Set([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "dessert",
  "side",
  "drink",
  "other",
]);
const validDifficulties = new Set(["easy", "medium", "challenging"]);
const validSorts = new Set([
  "newest",
  "oldest",
  "alphabetical",
  "recently_cooked",
  "most_cooked",
  "shortest",
]);

function cleanLabel(value: string | undefined, maximumLength: number) {
  const label = value?.trim();
  return label && label.length <= maximumLength ? label : undefined;
}

function allowedValue(value: string | undefined, allowed: Set<string>) {
  return value && allowed.has(value) ? value : undefined;
}

function minutesValue(value: string | undefined) {
  if (!value || !/^\d{1,5}$/.test(value)) return undefined;
  const minutes = Number(value);
  return minutes <= 10_080 ? minutes : undefined;
}

function pageValue(value: string | undefined) {
  if (!value || !/^\d{1,7}$/.test(value)) return 1;
  return Math.max(1, Number(value));
}

export interface RecipeLibraryParameters {
  q?: string;
  favorite?: string;
  category?: string;
  cuisine?: string;
  difficulty?: string;
  dietaryTag?: string;
  maxPrep?: string;
  maxTotal?: string;
  sort?: string;
  page?: string;
  view?: string;
}

export async function RecipeLibraryPage({
  parameters,
  favoritesOnly = false,
}: {
  parameters: RecipeLibraryParameters;
  favoritesOnly?: boolean;
}) {
  const query = cleanLabel(parameters.q, 240);
  const category = allowedValue(parameters.category, validCategories);
  const cuisine = cleanLabel(parameters.cuisine, 80);
  const difficulty = allowedValue(parameters.difficulty, validDifficulties);
  const dietaryTag = cleanLabel(parameters.dietaryTag, 60);
  const maxPrepMinutes = minutesValue(parameters.maxPrep);
  const maxTotalMinutes = minutesValue(parameters.maxTotal);
  const sort = allowedValue(parameters.sort, validSorts) as
    | "newest"
    | "oldest"
    | "alphabetical"
    | "recently_cooked"
    | "most_cooked"
    | "shortest"
    | undefined;
  const favorite = favoritesOnly || parameters.favorite === "1";
  const page = pageValue(parameters.page);
  const [results, filterOptions] = await Promise.all([
    listRecipes({
      query,
      favorite,
      category,
      cuisine,
      difficulty,
      dietaryTag,
      maxPrepMinutes,
      maxTotalMinutes,
      sort,
      page,
      pageSize: 12,
    }),
    getRecipeFilterOptions(),
  ]);
  const filtered = Boolean(
    query ||
    category ||
    cuisine ||
    difficulty ||
    dietaryTag ||
    maxPrepMinutes !== undefined ||
    maxTotalMinutes !== undefined ||
    (!favoritesOnly && favorite),
  );
  const view = parameters.view === "list" ? "list" : "grid";

  return (
    <PageContainer>
      <PageHeader
        title={favoritesOnly ? "Favorite recipes" : "Recipe library"}
        description={
          favoritesOnly
            ? "The recipes you reach for most."
            : "Search every recipe, ingredient, tag, and cuisine from one place."
        }
        action={
          <Button asChild>
            <Link href="/recipes/new">
              <Plus className="size-4" aria-hidden="true" />
              Add recipe
            </Link>
          </Button>
        }
      />
      <RecipeFilters
        cuisines={filterOptions.cuisines}
        dietaryTags={filterOptions.dietaryTags}
        lockedFavorite={favoritesOnly}
      />
      {results.recipes.length === 0 ? (
        <EmptyState
          icon={filtered ? SearchX : BookOpenText}
          title={
            filtered
              ? "No recipes match those filters"
              : favoritesOnly
                ? "No favorites yet"
                : "Your cookbook is ready for its first recipe"
          }
          description={
            filtered
              ? "Clear one or more filters and try again."
              : favoritesOnly
                ? "Tap the heart on a recipe to keep it close."
                : "Add a dish you already love, including its ingredients and cooking steps."
          }
          actionLabel={filtered ? "Clear filters" : "Add a recipe"}
          actionHref={
            filtered
              ? favoritesOnly
                ? "/favorites"
                : "/recipes"
              : "/recipes/new"
          }
        />
      ) : (
        <>
          <div
            className={
              view === "grid"
                ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                : "grid gap-3"
            }
          >
            {results.recipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                compact={view === "list"}
              />
            ))}
          </div>
          {results.total > results.pageSize && (
            <nav
              className="flex items-center justify-between border-t border-border pt-5"
              aria-label="Recipe pages"
            >
              <Button asChild variant="outline" disabled={results.page <= 1}>
                <Link
                  href={{
                    query: {
                      ...parameters,
                      page: Math.max(1, results.page - 1),
                    },
                  }}
                >
                  Previous
                </Link>
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {results.page} of{" "}
                {Math.ceil(results.total / results.pageSize)}
              </span>
              <Button
                asChild
                variant="outline"
                disabled={results.page * results.pageSize >= results.total}
              >
                <Link
                  href={{ query: { ...parameters, page: results.page + 1 } }}
                >
                  Next
                </Link>
              </Button>
            </nav>
          )}
        </>
      )}
      <Button
        asChild
        size="lg"
        className="mobile-fab-safe fixed z-10 rounded-full shadow-xl lg:hidden"
      >
        <Link href="/recipes/new">
          <Plus className="size-5" aria-hidden="true" />
          Add recipe
        </Link>
      </Button>
    </PageContainer>
  );
}
