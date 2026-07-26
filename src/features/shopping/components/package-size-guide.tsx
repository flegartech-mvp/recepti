"use client";

import { PackageSearch } from "lucide-react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  getPackageSizeOptions,
  type PackageSizeOption,
} from "@/lib/domain/package-sizes";
import type { ShoppingListItem } from "@/types/domain";

export function PackageSizeGuide({ item }: { item: ShoppingListItem }) {
  const { t, formatNumber } = useI18n();
  const options = getPackageSizeOptions(item);
  if (options.length === 0) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t("Plan package sizes for {name}", {
            name: item.ingredientName,
          })}
        >
          <PackageSearch className="size-4" aria-hidden="true" />
          {t("Package sizes")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("Package plan for {item}", { item: item.ingredientName })}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Generic size combinations for planning only. Check the packages available in your shop.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {options.map((option) => (
            <PackageOption
              key={`${option.packageQuantity}-${option.packageUnit}`}
              option={option}
              formatNumber={formatNumber}
              t={t}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PackageOption({
  option,
  formatNumber,
  t,
}: {
  option: PackageSizeOption;
  formatNumber: (value: number) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="font-semibold">
        {formatNumber(option.packageCount)} ×{" "}
        {formatNumber(option.packageQuantity)} {option.packageUnit}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("Total {quantity} {unit}", {
          quantity: formatNumber(option.totalQuantity),
          unit: option.totalUnit,
        })}
        {option.surplusQuantity > 0
          ? ` · ${t("{quantity} {unit} extra", {
              quantity: formatNumber(option.surplusQuantity),
              unit: option.totalUnit,
            })}`
          : ` · ${t("exact quantity")}`}
      </p>
    </div>
  );
}
