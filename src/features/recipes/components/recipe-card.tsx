import Image from "next/image";
import Link from "next/link";
import { ChefHat, Clock3, Gauge, Heart, Soup } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RecipeSummary } from "@/types/domain";

const categoryLabels: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  dessert: "Dessert",
  side: "Side",
  drink: "Drink",
  other: "Other",
};

export function RecipeCard({
  recipe,
  compact = false,
}: {
  recipe: RecipeSummary;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <article className="group relative grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-[0_8px_20px_var(--shadow)]">
        <RecipeImage recipe={recipe} className="aspect-square rounded-xl" />
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-2">
            <h2 className="min-w-0 font-semibold tracking-tight [overflow-wrap:anywhere]">
              <Link
                href={`/recipes/${recipe.id}`}
                className="before:absolute before:inset-0"
              >
                {recipe.title}
              </Link>
            </h2>
            {recipe.isFavorite && (
              <Heart
                className="size-4 shrink-0 fill-current text-primary-text"
                aria-label="Favorite"
              />
            )}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{categoryLabels[recipe.category]}</span>
            <span>{recipe.totalMinutes} min</span>
            <span className="capitalize">{recipe.difficulty}</span>
          </p>
        </div>
        {recipe.matchPercentage !== undefined && (
          <PantryMatchIndicator percentage={recipe.matchPercentage} compact />
        )}
      </article>
    );
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[0_8px_24px_var(--shadow)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_14px_34px_var(--shadow)]">
      <RecipeImage recipe={recipe} className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 text-lg font-semibold leading-snug tracking-tight [overflow-wrap:anywhere]">
              <Link
                href={`/recipes/${recipe.id}`}
                className="after:absolute after:inset-0"
              >
                {recipe.title}
              </Link>
            </h2>
            {recipe.isFavorite && (
              <Heart
                className="mt-0.5 size-[1.1rem] shrink-0 fill-current text-primary-text"
                aria-label="Favorite"
              />
            )}
          </div>
          {recipe.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {recipe.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{categoryLabels[recipe.category]}</Badge>
          {recipe.dietaryTags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border/70 pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {recipe.totalMinutes} min
          </span>
          <span className="flex items-center gap-1.5 capitalize">
            <ChefHat className="size-3.5" aria-hidden="true" />
            {recipe.difficulty}
          </span>
          {recipe.matchPercentage !== undefined && (
            <PantryMatchIndicator percentage={recipe.matchPercentage} />
          )}
        </div>
      </div>
    </article>
  );
}

function PantryMatchIndicator({
  percentage,
  compact = false,
}: {
  percentage: number;
  compact?: boolean;
}) {
  const roundedPercentage = Math.round(percentage);
  const label = `${roundedPercentage}% pantry match`;

  return (
    <Badge
      variant="outline"
      aria-label={label}
      title={label}
      className={cn(
        "border-primary/30 bg-primary-soft font-semibold text-primary-text",
        compact && "justify-self-end px-1.5 sm:px-2",
      )}
    >
      <Gauge aria-hidden="true" />
      <span>{roundedPercentage}%</span>
      <span className={compact ? "hidden sm:inline" : undefined}>pantry</span>
    </Badge>
  );
}

function RecipeImage({
  recipe,
  className,
}: {
  recipe: RecipeSummary;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[linear-gradient(145deg,var(--surface-tint),color-mix(in_oklab,var(--accent)_48%,var(--background)))]",
        className,
      )}
    >
      {recipe.imageUrl ? (
        <Image
          src={recipe.imageUrl}
          alt={`Cover for ${recipe.title}`}
          fill
          sizes="(max-width: 768px) 92vw, (max-width: 1280px) 45vw, 30vw"
          className="object-cover transition-transform duration-200 group-hover:scale-[1.025]"
        />
      ) : (
        <div className="grid h-full place-items-center text-muted-foreground/55">
          <Soup className="size-12" strokeWidth={1.3} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
