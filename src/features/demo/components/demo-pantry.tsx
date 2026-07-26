"use client";

import { Check, PackageOpen, RotateCcw } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PantryItem } from "@/types/domain";

interface DemoPantryProps {
  pantry: readonly PantryItem[];
  selectedIds: ReadonlySet<string>;
  onToggle: (id: string, selected: boolean) => void;
  onReset: () => void;
}

export function DemoPantry({
  pantry,
  selectedIds,
  onToggle,
  onReset,
}: DemoPantryProps) {
  const { t, formatNumber } = useI18n();

  return (
    <aside
      className="rounded-2xl border border-border bg-card p-5 shadow-[0_10px_30px_var(--shadow)] sm:p-6 lg:sticky lg:top-5 lg:self-start"
      aria-labelledby="demo-pantry-heading"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-text">
            <PackageOpen className="size-5" aria-hidden="true" />
          </span>
          <h2
            id="demo-pantry-heading"
            className="mt-4 text-xl font-semibold tracking-tight"
          >
            {t("Sample pantry")}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t("Toggle ingredients to change the recipe ranking instantly.")}
          </p>
        </div>
        <Badge variant="secondary">
          {formatNumber(selectedIds.size)}/{formatNumber(pantry.length)}
        </Badge>
      </div>

      <div className="mt-5 space-y-1">
        {pantry.map((item) => {
          const selected = selectedIds.has(item.id);
          return (
            <label
              key={item.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-primary-soft has-focus-visible:ring-3 has-focus-visible:ring-ring"
            >
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) =>
                  onToggle(item.id, checked === true)
                }
                aria-label={t("Use {name}", {
                  name: item.ingredient.displayName,
                })}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {item.ingredient.displayName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.quantity === null
                    ? t("Quantity unknown")
                    : `${formatNumber(item.quantity)} ${item.unit ?? ""}`}
                </span>
              </span>
              {selected && (
                <Check
                  className="size-4 shrink-0 text-primary-text"
                  aria-hidden="true"
                />
              )}
            </label>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-5 w-full"
        onClick={onReset}
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {t("Restore sample pantry")}
      </Button>
    </aside>
  );
}
