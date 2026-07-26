"use client";

import { useI18n } from "@/components/i18n-provider";
import { hasPackageSizeGuidance } from "@/lib/domain/package-sizes";
import type { ShoppingListItem } from "@/types/domain";

export function PackagePlanSummary({ items }: { items: ShoppingListItem[] }) {
  const { t, formatNumber } = useI18n();
  const guidedCount = items.filter(hasPackageSizeGuidance).length;
  if (items.length === 0 || guidedCount === 0) return null;
  return (
    <aside className="rounded-xl border border-border bg-surface-secondary p-4 text-sm">
      <p className="font-semibold">{t("Package planning")}</p>
      <p className="mt-1 text-muted-foreground">
        {t("Generic package-size guidance is available for {count} items.", {
          count: formatNumber(guidedCount),
        })}
      </p>
    </aside>
  );
}
