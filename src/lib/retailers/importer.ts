import { createHash } from "node:crypto";

import {
  normalizePackageUnit,
  normalizeSlovenianText,
  parseLocalizedDecimal,
  parsePackageText,
} from "./normalization";
import { isSafeRetailerSourceUrl } from "./security";
import {
  normalizedRetailerProductSchema,
  type NormalizedRetailerProduct,
  type RetailerSlug,
} from "./types";

export interface CatalogImportResult {
  products: NormalizedRetailerProduct[];
  errors: Array<{ row: number; message: string }>;
}

export function sourceHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function recordFromCsv(
  headers: string[],
  cells: string[],
): Record<string, string> {
  return Object.fromEntries(
    headers.map((header, index) => [header, cells[index] ?? ""]),
  );
}

function normalizeImportRecord(
  record: Record<string, unknown>,
  retailerSlug: RetailerSlug,
  allowedHosts: readonly string[],
): unknown {
  const packageText = String(
    record.packageText ?? record.package_text ?? "",
  ).trim();
  const parsedPackage = parsePackageText(packageText);
  const name = String(record.name ?? "").trim();
  const sourceUrl = String(record.sourceUrl ?? record.source_url ?? "").trim();
  const sourceImageUrl = String(
    record.sourceImageUrl ?? record.source_image_url ?? "",
  ).trim();
  const numberValue = (value: unknown) => {
    if (value === undefined || value === null || value === "") return undefined;
    return parseLocalizedDecimal(String(value)) ?? value;
  };
  return {
    retailerSlug,
    externalId: String(
      record.externalId ?? record.external_id ?? record.sku ?? "",
    ).trim(),
    sku: String(record.sku ?? "").trim() || undefined,
    ean: String(record.ean ?? "").trim() || undefined,
    name,
    normalizedName: normalizeSlovenianText(
      String(record.normalizedName ?? record.normalized_name ?? name),
    ),
    brand: String(record.brand ?? "").trim() || undefined,
    description: String(record.description ?? "").trim() || undefined,
    category: String(record.category ?? "").trim() || undefined,
    subcategory: String(record.subcategory ?? "").trim() || undefined,
    packageQuantity: numberValue(
      record.packageQuantity ??
        record.package_quantity ??
        parsedPackage.quantity ??
        undefined,
    ),
    packageUnit:
      normalizePackageUnit(
        String(
          record.packageUnit ?? record.package_unit ?? parsedPackage.unit ?? "",
        ),
      ) ?? undefined,
    packageText: packageText || undefined,
    countryOfOrigin:
      String(record.countryOfOrigin ?? record.country_of_origin ?? "").trim() ||
      undefined,
    sourceUrl:
      sourceUrl && isSafeRetailerSourceUrl(sourceUrl, allowedHosts)
        ? sourceUrl
        : undefined,
    sourceImageUrl:
      sourceImageUrl && isSafeRetailerSourceUrl(sourceImageUrl, allowedHosts)
        ? sourceImageUrl
        : undefined,
    imageMode: record.imageMode ?? record.image_mode ?? "none",
    price: numberValue(record.price ?? record.regular_price),
    promotionalPrice: numberValue(
      record.promotionalPrice ?? record.promotional_price,
    ),
    loyaltyPrice: numberValue(record.loyaltyPrice ?? record.loyalty_price),
    currency: record.currency || "EUR",
    unitPrice: numberValue(record.unitPrice ?? record.unit_price),
    unitPriceUnit:
      normalizePackageUnit(
        String(record.unitPriceUnit ?? record.unit_price_unit ?? ""),
      ) ?? undefined,
    validFrom: (record.validFrom ?? record.valid_from) || undefined,
    validUntil: (record.validUntil ?? record.valid_until) || undefined,
    observedAt:
      record.observedAt ?? record.observed_at ?? new Date().toISOString(),
    active: ![false, "false", "0", 0].includes(record.active as never),
    promotionLabel:
      String(record.promotionLabel ?? record.promotion_label ?? "").trim() ||
      undefined,
  };
}

function validateRecords(
  records: Record<string, unknown>[],
  retailerSlug: RetailerSlug,
  allowedHosts: readonly string[],
): CatalogImportResult {
  const products: NormalizedRetailerProduct[] = [];
  const errors: CatalogImportResult["errors"] = [];
  const dedupe = new Set<string>();
  records.forEach((record, index) => {
    const parsed = normalizedRetailerProductSchema.safeParse(
      normalizeImportRecord(record, retailerSlug, allowedHosts),
    );
    if (!parsed.success) {
      errors.push({
        row: index + 2,
        message: parsed.error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("; "),
      });
      return;
    }
    const key = `${parsed.data.retailerSlug}:${parsed.data.externalId}`;
    if (dedupe.has(key)) {
      errors.push({
        row: index + 2,
        message: "Duplicate retailer external ID in import.",
      });
      return;
    }
    dedupe.add(key);
    products.push(parsed.data);
  });
  return { products, errors };
}

export function parseCatalogCsv(
  input: string,
  retailerSlug: RetailerSlug,
  allowedHosts: readonly string[] = [],
): CatalogImportResult {
  if (input.length > 10 * 1024 * 1024)
    return {
      products: [],
      errors: [{ row: 0, message: "CSV exceeds the 10 MB import limit." }],
    };
  const lines = input
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (lines.length < 2)
    return {
      products: [],
      errors: [
        { row: 0, message: "CSV requires a header and at least one product." },
      ],
    };
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map((header) =>
    header.trim(),
  );
  return validateRecords(
    lines
      .slice(1)
      .map((line) => recordFromCsv(headers, splitCsvLine(line, delimiter))),
    retailerSlug,
    allowedHosts,
  );
}

export function parseCatalogJson(
  input: string,
  retailerSlug: RetailerSlug,
  allowedHosts: readonly string[] = [],
): CatalogImportResult {
  if (input.length > 10 * 1024 * 1024)
    return {
      products: [],
      errors: [{ row: 0, message: "JSON exceeds the 10 MB import limit." }],
    };
  try {
    const parsed: unknown = JSON.parse(input);
    const records = Array.isArray(parsed)
      ? parsed
      : typeof parsed === "object" &&
          parsed !== null &&
          Array.isArray((parsed as { products?: unknown }).products)
        ? (parsed as { products: unknown[] }).products
        : null;
    if (!records)
      return {
        products: [],
        errors: [
          {
            row: 0,
            message:
              "JSON must be an array or an object containing a products array.",
          },
        ],
      };
    return validateRecords(
      records.filter(
        (record): record is Record<string, unknown> =>
          typeof record === "object" && record !== null,
      ),
      retailerSlug,
      allowedHosts,
    );
  } catch {
    return {
      products: [],
      errors: [{ row: 0, message: "JSON could not be parsed." }],
    };
  }
}
