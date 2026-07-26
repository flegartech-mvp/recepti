import type { ShoppingListItem } from "@/types/domain";

import { convertQuantity, normalizeUnit } from "./quantities";

export interface PackageSizeOption {
  packageQuantity: number;
  packageUnit: string;
  packageCount: number;
  totalQuantity: number;
  totalUnit: string;
  surplusQuantity: number;
}

const GENERIC_PACKAGE_SIZES: Readonly<Record<string, readonly number[]>> = {
  g: [100, 250, 500, 1_000, 2_000],
  ml: [250, 500, 750, 1_000, 1_500, 2_000],
  piece: [2, 4, 6, 10, 12, 24],
  can: [1, 2, 4, 6],
  packet: [1, 2, 4, 6],
  bunch: [1, 2, 3],
};

function baseUnit(unit: string): string | null {
  if (unit === "g" || unit === "kg") return "g";
  if (unit === "ml" || unit === "l") return "ml";
  return GENERIC_PACKAGE_SIZES[unit] ? unit : null;
}

function displayPackage(
  quantity: number,
  unit: string,
): { quantity: number; unit: string } {
  if (unit === "g" && quantity >= 1_000 && quantity % 1_000 === 0)
    return { quantity: quantity / 1_000, unit: "kg" };
  if (unit === "ml" && quantity >= 1_000 && quantity % 500 === 0)
    return { quantity: quantity / 1_000, unit: "l" };
  return { quantity, unit };
}

export function getPackageSizeOptions(
  item: Pick<ShoppingListItem, "quantity" | "unit">,
  limit = 3,
): PackageSizeOption[] {
  if (
    item.quantity == null ||
    !Number.isFinite(item.quantity) ||
    item.quantity <= 0
  )
    return [];
  const normalizedUnit = normalizeUnit(item.unit);
  if (!normalizedUnit) return [];
  const unit = baseUnit(normalizedUnit);
  if (!unit) return [];
  const requested = convertQuantity(item.quantity, normalizedUnit, unit);
  if (requested == null || requested <= 0) return [];
  const options = (GENERIC_PACKAGE_SIZES[unit] ?? [])
    .map((packageQuantity) => {
      const packageCount = Math.ceil(requested / packageQuantity);
      const totalQuantity = packageCount * packageQuantity;
      const display = displayPackage(packageQuantity, unit);
      return {
        packageQuantity: display.quantity,
        packageUnit: display.unit,
        packageCount,
        totalQuantity,
        totalUnit: unit,
        surplusQuantity: Math.max(0, totalQuantity - requested),
      };
    })
    .filter((option) => option.packageCount <= 6);
  return options
    .sort(
      (left, right) =>
        left.surplusQuantity - right.surplusQuantity ||
        left.packageCount - right.packageCount ||
        right.totalQuantity - left.totalQuantity,
    )
    .slice(0, Math.max(0, limit));
}

export function hasPackageSizeGuidance(
  item: Pick<ShoppingListItem, "quantity" | "unit">,
): boolean {
  return getPackageSizeOptions(item, 1).length > 0;
}
