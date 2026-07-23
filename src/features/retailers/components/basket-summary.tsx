"use client";

import { useI18n } from "@/components/i18n-provider";
import type { ShoppingListItem } from "@/types/domain";
import type {
  RetailerPreferences,
  RetailerProduct,
} from "@/lib/retailers/types";
import { rankRetailerProducts } from "@/lib/retailers/matching";

export function BasketSummary({
  items,
  products,
  preferences,
}: {
  items: ShoppingListItem[];
  products: RetailerProduct[];
  preferences: RetailerPreferences;
}) {
  const { t } = useI18n();
  if (items.length === 0 || products.length === 0) return null;
  const matchedItems = items.filter(
    (item) => rankRetailerProducts(products, preferences, item).length > 0,
  ).length;
  return (
    <aside className="rounded-xl border border-border bg-surface-secondary p-4 text-sm">
      <p className="font-semibold">{t("Catalogue options")}</p>
      <p className="mt-1 text-muted-foreground">
        {t("Available catalogue matches are shown beside each shopping item.")}{" "}
        {matchedItems}/{items.length}
      </p>
    </aside>
  );
}
