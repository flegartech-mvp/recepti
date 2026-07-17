import { z } from "zod";

export const RETAILER_SLUGS = ["spar-si", "hofer-si", "lidl-si"] as const;
export const IMAGE_MODES = [
  "external-authorized",
  "imported-authorized",
  "user-uploaded",
  "local-placeholder",
  "none",
] as const;

export const retailerSlugSchema = z.enum(RETAILER_SLUGS);
export const imageModeSchema = z.enum(IMAGE_MODES);
export const packageUnitSchema = z.enum([
  "g",
  "kg",
  "ml",
  "cl",
  "dl",
  "l",
  "piece",
  "pack",
]);

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).max(maximum).optional(),
  );

export const normalizedRetailerProductSchema = z
  .object({
    retailerSlug: retailerSlugSchema,
    externalId: z.string().trim().min(1).max(160),
    sku: optionalText(120),
    ean: z.preprocess(
      (value) =>
        value === null || value === undefined || value === ""
          ? undefined
          : String(value),
      z
        .string()
        .regex(/^\d{8}$|^\d{12,14}$/)
        .optional(),
    ),
    name: z.string().trim().min(1).max(300),
    normalizedName: z.string().trim().min(1).max(300),
    brand: optionalText(160),
    description: optionalText(4_000),
    category: optionalText(160),
    subcategory: optionalText(160),
    packageQuantity: z.coerce.number().positive().max(1_000_000).optional(),
    packageUnit: packageUnitSchema.optional(),
    packageText: optionalText(160),
    countryOfOrigin: optionalText(120),
    sourceUrl: z.url().max(2_048).optional(),
    sourceImageUrl: z.url().max(2_048).optional(),
    imageMode: imageModeSchema.default("none"),
    price: z.coerce.number().nonnegative().max(1_000_000).optional(),
    promotionalPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
    loyaltyPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
    currency: z.literal("EUR").default("EUR"),
    unitPrice: z.coerce.number().nonnegative().max(1_000_000).optional(),
    unitPriceUnit: packageUnitSchema.optional(),
    validFrom: z.iso.datetime().optional(),
    validUntil: z.iso.datetime().optional(),
    observedAt: z.iso.datetime(),
    active: z.boolean().default(true),
    promotionLabel: optionalText(240),
  })
  .strict()
  .superRefine((product, context) => {
    if (
      product.promotionalPrice !== undefined &&
      product.price !== undefined &&
      product.promotionalPrice > product.price
    ) {
      context.addIssue({
        code: "custom",
        path: ["promotionalPrice"],
        message: "Promotional price cannot exceed the regular price.",
      });
    }
    if (
      product.validFrom &&
      product.validUntil &&
      product.validFrom > product.validUntil
    ) {
      context.addIssue({
        code: "custom",
        path: ["validUntil"],
        message: "Offer validity ends before it starts.",
      });
    }
  });

export type RetailerSlug = z.infer<typeof retailerSlugSchema>;
export type ImageMode = z.infer<typeof imageModeSchema>;
export type PackageUnit = z.infer<typeof packageUnitSchema>;
export type NormalizedRetailerProduct = z.output<
  typeof normalizedRetailerProductSchema
>;

export interface RetailerOffer {
  id: string;
  regularPrice: number | null;
  promotionalPrice: number | null;
  loyaltyPrice: number | null;
  currency: "EUR";
  unitPrice: number | null;
  unitPriceUnit: PackageUnit | null;
  validFrom: string | null;
  validUntil: string | null;
  promotionLabel: string | null;
  observedAt: string;
}

export interface RetailerProduct {
  id: string;
  retailerId: string;
  retailerSlug: RetailerSlug;
  retailerName: string;
  externalId: string;
  sku: string | null;
  ean: string | null;
  name: string;
  normalizedName: string;
  brand: string | null;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  packageQuantity: number | null;
  packageUnit: PackageUnit | null;
  packageText: string | null;
  sourceUrl: string | null;
  sourceImageUrl: string | null;
  imageMode: ImageMode;
  active: boolean;
  lastSeenAt: string;
  isDemo: boolean;
  ingredientIds: string[];
  matchConfidence: number | null;
  offers: RetailerOffer[];
}

export interface RetailerPreferences {
  enabledRetailers: RetailerSlug[];
  preferredRetailer: RetailerSlug | null;
  allowLoyaltyPrices: boolean;
  allowSplitBasket: boolean;
  preferPromotions: boolean;
  preferredBrands: string[];
  excludedBrands: string[];
}

export const defaultRetailerPreferences: RetailerPreferences = {
  enabledRetailers: [...RETAILER_SLUGS],
  preferredRetailer: null,
  allowLoyaltyPrices: false,
  allowSplitBasket: true,
  preferPromotions: true,
  preferredBrands: [],
  excludedBrands: [],
};
