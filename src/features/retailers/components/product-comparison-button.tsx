"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import type { ShoppingListItem } from "@/types/domain";
import type {
  RetailerPreferences,
  RetailerProduct,
} from "@/lib/retailers/types";

export function ProductComparisonButton({
  item,
  products,
}: {
  item: ShoppingListItem;
  products: RetailerProduct[];
  preferences: RetailerPreferences;
}) {
  const { t, formatNumber } = useI18n();
  if (products.length === 0) return null;
  const best = products
    .filter((product) => product.price !== null)
    .sort(
      (left, right) => (left.price ?? Infinity) - (right.price ?? Infinity),
    )[0];
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-label={t("Compare {name}", { name: item.ingredientName })}
    >
      {t("Compare")}
      {best?.price !== null && best?.price !== undefined && (
        <Badge variant="secondary">
          {formatNumber(best.price)} {best.currency}
        </Badge>
      )}
    </Button>
  );
}
