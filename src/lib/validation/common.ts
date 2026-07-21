import { z } from "zod";

import { parseQuantity } from "@/lib/domain/quantities";

export const uuidSchema = z.string().uuid("Choose a valid record.");

export function optionalTrimmedString(maxLength: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maxLength).nullable().optional(),
  );
}

function quantityInput(value: unknown): unknown {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string" && typeof value !== "number") {
    return value;
  }

  return parseQuantity(value) ?? value;
}

export const optionalQuantitySchema = z.preprocess(
  quantityInput,
  z.number().finite().nonnegative("Quantity cannot be negative.").nullable(),
);

export const optionalPositiveQuantitySchema = z.preprocess(
  quantityInput,
  z
    .number()
    .finite()
    .positive("Quantity must be greater than zero.")
    .nullable(),
);

export const unitSchema = optionalTrimmedString(40);

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export const optionalDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().refine(isCalendarDate, "Use a valid date.").nullable().optional(),
);

export const timestampSchema = z.string().datetime({ offset: true });

export const normalizedUniqueStringArray = (
  maximumItems: number,
  maximumLength: number,
) =>
  z
    .array(z.string().trim().min(1).max(maximumLength))
    .max(maximumItems)
    .superRefine((items, context) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        const key = item.normalize("NFC").toLowerCase();
        if (seen.has(key)) {
          context.addIssue({
            code: "custom",
            message: "Remove duplicate values.",
            path: [index],
          });
        }
        seen.add(key);
      });
    });
