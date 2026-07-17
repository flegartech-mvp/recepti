import type { PackageUnit } from "./types";

const unitAliases: Record<string, PackageUnit> = {
  g: "g",
  gr: "g",
  kg: "kg",
  ml: "ml",
  cl: "cl",
  dl: "dl",
  l: "l",
  liter: "l",
  litre: "l",
  kos: "piece",
  kosa: "piece",
  kosi: "piece",
  kom: "piece",
  piece: "piece",
  pcs: "piece",
  pak: "pack",
  paket: "pack",
  pack: "pack",
};

export function normalizeSlovenianText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("sl-SI")
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseLocalizedDecimal(value: string | number): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = value
    .trim()
    .replace(/[€\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizePackageUnit(
  value: string | null | undefined,
): PackageUnit | null {
  if (!value) return null;
  return unitAliases[normalizeSlovenianText(value)] ?? null;
}

export interface ParsedPackage {
  quantity: number | null;
  unit: PackageUnit | null;
  multiplier: number;
  original: string;
}

export function parsePackageText(value: string): ParsedPackage {
  const original = value.trim();
  const normalized = original.toLocaleLowerCase("sl-SI").replace(/,/g, ".");
  const multipack = normalized.match(
    /(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*([\p{L}]+)/u,
  );
  if (multipack) {
    const multiplier = Number(multipack[1]);
    const each = Number(multipack[2]);
    const unit = normalizePackageUnit(multipack[3]);
    return {
      quantity: unit ? multiplier * each : null,
      unit,
      multiplier,
      original,
    };
  }
  const single = normalized.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*([\p{L}]+)(?:\s|$)/u,
  );
  if (!single) return { quantity: null, unit: null, multiplier: 1, original };
  const unit = normalizePackageUnit(single[2]);
  return {
    quantity: unit ? Number(single[1]) : null,
    unit,
    multiplier: 1,
    original,
  };
}

export function isValidEan(value: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  if (check === undefined) return false;
  const sum = digits
    .reverse()
    .reduce(
      (total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1),
      0,
    );
  return (10 - (sum % 10)) % 10 === check;
}
