"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ShoppingListItem } from "@/types/domain";

import { PackageSizeGuide } from "./package-size-guide";

export function ShoppingRow({
  item,
  large,
  pending,
  onToggle,
  onDelete,
}: {
  item: ShoppingListItem;
  large: boolean;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t, formatNumber } = useI18n();
  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto]",
        large && "min-h-20 p-5",
      )}
    >
      <Checkbox
        checked={item.isCompleted}
        onCheckedChange={onToggle}
        disabled={pending}
        className={large ? "size-7" : ""}
        aria-label={t("Mark {name} {state}", {
          name: item.ingredientName,
          state: t(item.isCompleted ? "needed" : "purchased"),
        })}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-semibold [overflow-wrap:anywhere]",
            item.isCompleted && "text-muted-foreground line-through",
            large && "text-xl",
          )}
        >
          {item.quantity !== null &&
            `${formatNumber(item.quantity)} ${item.unit ?? ""} `}
          {item.ingredientName}
        </p>
        {item.recipeId && (
          <Link
            href={`/recipes/${item.recipeId}`}
            className="mt-1 block text-xs text-primary-text [overflow-wrap:anywhere] hover:underline"
          >
            {t("For {recipe}", { recipe: item.recipeTitle ?? t("a recipe") })}
          </Link>
        )}
      </div>
      <Button
        className="sm:col-start-4 sm:row-start-1"
        variant="ghost"
        size="icon-sm"
        onClick={onDelete}
        disabled={pending}
        aria-label={t("Delete {name}", { name: item.ingredientName })}
      >
        <Trash2 className="size-4" />
      </Button>
      <div className="col-span-2 col-start-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1">
        <PackageSizeGuide item={item} />
      </div>
    </li>
  );
}
