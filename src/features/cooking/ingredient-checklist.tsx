"use client";

import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { formatQuantity } from "@/lib/domain/quantities";
import { cn } from "@/lib/utils";
import type { RecipeIngredient } from "@/types/domain";

interface IngredientChecklistProps {
  ingredients: readonly RecipeIngredient[];
  checkedIds: ReadonlySet<string>;
  onCheckedChange: (id: string, checked: boolean) => void;
}

function ingredientAmount(ingredient: RecipeIngredient): string {
  return [formatQuantity(ingredient.quantity), ingredient.unit]
    .filter(Boolean)
    .join(" ");
}

export function IngredientChecklist({
  ingredients,
  checkedIds,
  onCheckedChange,
}: IngredientChecklistProps) {
  const groups = useMemo(() => {
    const result = new Map<string, RecipeIngredient[]>();
    for (const ingredient of ingredients) {
      const section = ingredient.sectionName?.trim() || "Ingredients";
      const group = result.get(section) ?? [];
      group.push(ingredient);
      result.set(section, group);
    }
    return [...result.entries()];
  }, [ingredients]);

  if (ingredients.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No ingredients were added to this recipe.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map(([section, items], groupIndex) => {
        const headingId = `ingredient-section-${groupIndex}`;
        return (
          <section
            key={section}
            aria-labelledby={groups.length > 1 ? headingId : undefined}
          >
            {groups.length > 1 ? (
              <h3
                id={headingId}
                className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase"
              >
                {section}
              </h3>
            ) : null}
            <ul className="space-y-1">
              {items.map((ingredient) => {
                const checked = checkedIds.has(ingredient.id);
                const amount = ingredientAmount(ingredient);
                return (
                  <li key={ingredient.id}>
                    <label
                      className={cn(
                        "hover:bg-muted/70 focus-within:ring-ring flex min-h-12 cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 transition-colors focus-within:ring-2",
                        checked && "bg-accent/45",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          onCheckedChange(ingredient.id, value === true)
                        }
                        className="mt-0.5 size-5"
                        aria-label={`Mark ${ingredient.displayName} as ${checked ? "not prepared" : "prepared"}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-sm font-medium leading-5",
                            checked && "text-muted-foreground line-through",
                          )}
                        >
                          {amount ? `${amount} ` : ""}
                          {ingredient.displayName}
                        </span>
                        {ingredient.preparationNote ||
                        ingredient.isOptional ||
                        ingredient.isGarnish ? (
                          <span className="text-muted-foreground mt-0.5 block text-xs leading-4">
                            {[
                              ingredient.preparationNote,
                              ingredient.isOptional ? "optional" : null,
                              ingredient.isGarnish ? "garnish" : null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
