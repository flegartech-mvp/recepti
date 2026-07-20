"use client";

import { useI18n } from "@/components/i18n-provider";
import type { ShoppingListItem } from "@/types/domain";
import type {
  RetailerPreferences,
  RetailerProduct,
} from "@/lib/retailers/types";

export function BasketSummary({
  items,
  products,
}: {
  items: ShoppingListItem[];
  products: RetailerProduct[];
  preferences: RetailerPreferences;
}) {
  const { t } = useI18n();
  if (items.length === 0 || products.length === 0) return null;
  return (
    <aside className="rounded-xl border border-border bg-surface-secondary p-4 text-sm">
      <p className="font-semibold">{t("Product comparison")}</p>
      <p className="mt-1 text-muted-foreground">
        {t("Available catalogue matches are shown beside each shopping item.")}
      </p>
    </aside>
  );
}
