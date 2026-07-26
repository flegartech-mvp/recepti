"use client";

import { ArrowLeft, Check, ShoppingBasket, Trash2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ShoppingListItem } from "@/types/domain";

interface DemoShoppingListProps {
  items: readonly ShoppingListItem[];
  onBack: () => void;
  onToggle: (itemId: string) => void;
  onRemove: (itemId: string) => void;
}

export function DemoShoppingList({
  items,
  onBack,
  onToggle,
  onRemove,
}: DemoShoppingListProps) {
  const { t, formatNumber } = useI18n();
  const remaining = items.filter((item) => !item.isCompleted).length;

  return (
    <section className="space-y-6" aria-labelledby="demo-shopping-heading">
      <Button type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("Back to recipe ranking")}
      </Button>

      <header className="rounded-2xl border border-primary/20 bg-primary-soft p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
          <ShoppingBasket className="size-5" aria-hidden="true" />
        </span>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              id="demo-shopping-heading"
              className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
            >
              {t("Temporary shopping list")}
            </h1>
            <p className="mt-2 max-w-xl leading-relaxed text-foreground/75">
              {t(
                "Missing recipe ingredients land here without touching a private account.",
              )}
            </p>
          </div>
          <Badge variant="secondary">
            {t("{count} remaining", { count: formatNumber(remaining) })}
          </Badge>
        </div>
      </header>

      {items.length > 0 ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_6px_20px_var(--shadow)] sm:px-5"
            >
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={() => onToggle(item.id)}
                aria-label={t("Mark {name} as purchased", {
                  name: item.ingredientName,
                })}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={
                    item.isCompleted
                      ? "font-medium text-muted-foreground line-through"
                      : "font-medium"
                  }
                >
                  {item.ingredientName}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.quantity === null
                    ? t("Quantity as needed")
                    : `${formatNumber(item.quantity)} ${item.unit ?? ""}`}
                  {item.recipeTitle
                    ? `, ${t("for {title}", { title: item.recipeTitle })}`
                    : ""}
                </p>
              </div>
              {item.isCompleted && (
                <Check
                  className="size-4 shrink-0 text-primary-text"
                  aria-hidden="true"
                />
              )}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => onRemove(item.id)}
                aria-label={t("Remove {name}", {
                  name: item.ingredientName,
                })}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-card text-center">
          <div className="max-w-sm p-6">
            <ShoppingBasket
              className="mx-auto size-11 text-primary-text"
              aria-hidden="true"
            />
            <h2 className="mt-4 text-xl font-semibold">
              {t("Your demo list is empty")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t(
                "Open a recipe with missing ingredients and add them from its match explanation.",
              )}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
