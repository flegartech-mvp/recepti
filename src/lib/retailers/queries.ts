import { notFound } from "next/navigation";

import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

import { demoRetailerProducts, demoRetailers } from "./fixtures";
import { normalizeSlovenianText } from "./normalization";
import {
  defaultRetailerPreferences,
  RETAILER_SLUGS,
  type PackageUnit,
  type RetailerProduct,
  type RetailerSlug,
} from "./types";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  typeof value === "object" && value !== null ? (value as RecordValue) : {};
const text = (value: unknown): string =>
  typeof value === "string" ? value : "";
const nullableText = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;
const nullableNumber = (value: unknown): number | null =>
  value === null ||
  value === undefined ||
  value === "" ||
  !Number.isFinite(Number(value))
    ? null
    : Number(value);

function mapProduct(value: unknown): RetailerProduct {
  const row = record(value);
  const retailer = record(row.retailers);
  const matches = Array.isArray(row.ingredient_product_matches)
    ? row.ingredient_product_matches
        .map(record)
        .filter((match) => match.review_status !== "rejected")
    : [];
  const slug = RETAILER_SLUGS.includes(text(retailer.slug) as RetailerSlug)
    ? (text(retailer.slug) as RetailerSlug)
    : "spar-si";
  return {
    id: text(row.id),
    retailerId: text(row.retailer_id),
    retailerSlug: slug,
    retailerName: text(retailer.display_name),
    externalId: text(row.external_id),
    sku: nullableText(row.sku),
    ean: nullableText(row.ean),
    name: text(row.name),
    normalizedName: text(row.normalized_name),
    brand: nullableText(row.brand),
    description: nullableText(row.description),
    category: nullableText(row.category),
    subcategory: nullableText(row.subcategory),
    packageQuantity: nullableNumber(row.package_quantity),
    packageUnit: nullableText(row.package_unit) as PackageUnit | null,
    packageText: nullableText(row.package_text),
    sourceUrl: nullableText(row.source_url),
    sourceImageUrl: nullableText(row.source_image_url),
    imageMode: (nullableText(row.image_mode) ??
      "none") as RetailerProduct["imageMode"],
    active: row.active === true,
    lastSeenAt: text(row.last_seen_at),
    isDemo: false,
    ingredientIds: matches
      .map((match) => text(match.ingredient_id))
      .filter(Boolean),
    matchConfidence: matches.length
      ? Math.max(...matches.map((match) => Number(match.confidence) || 0))
      : null,
    offers: (Array.isArray(row.retailer_offers) ? row.retailer_offers : [])
      .map((offerValue) => {
        const offer = record(offerValue);
        return {
          id: text(offer.id),
          regularPrice: nullableNumber(offer.regular_price),
          promotionalPrice: nullableNumber(offer.promotional_price),
          loyaltyPrice: nullableNumber(offer.loyalty_price),
          currency: "EUR" as const,
          unitPrice: nullableNumber(offer.unit_price),
          unitPriceUnit: nullableText(
            offer.unit_price_unit,
          ) as PackageUnit | null,
          validFrom: nullableText(offer.valid_from),
          validUntil: nullableText(offer.valid_until),
          promotionLabel: nullableText(offer.promotion_label),
          observedAt: text(offer.observed_at),
        };
      })
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt)),
  };
}

export interface ProductFilters {
  query?: string;
  retailer?: RetailerSlug;
  category?: string;
  promotion?: boolean;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listRetailerProducts(
  filters: ProductFilters = {},
): Promise<{
  products: RetailerProduct[];
  total: number;
  page: number;
  pageSize: number;
}> {
  await requireOwner("/products");
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(48, Math.max(6, filters.pageSize ?? 12));
  if (isTestAuthenticationEnabled()) {
    const query = normalizeSlovenianText(filters.query ?? "");
    const filtered = demoRetailerProducts.filter(
      (product) =>
        (!query ||
          [
            product.name,
            product.brand ?? "",
            product.category ?? "",
            product.ean ?? "",
          ].some((value) => normalizeSlovenianText(value).includes(query))) &&
        (!filters.retailer || product.retailerSlug === filters.retailer) &&
        (!filters.category || product.category === filters.category) &&
        (filters.active === false || product.active) &&
        (!filters.promotion ||
          product.offers.some(
            (offer) =>
              offer.promotionalPrice !== null || offer.loyaltyPrice !== null,
          )),
    );
    return {
      products: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }
  const client = await createClient();
  let query = client
    .from("retailer_products")
    .select(
      "*,retailers!inner(slug,display_name),retailer_offers(*),ingredient_product_matches(ingredient_id,confidence,review_status)",
      { count: "exact" },
    );
  if (filters.query)
    query = query.or(
      `name.ilike.%${filters.query.replace(/[%_,()]/g, "")}%,brand.ilike.%${filters.query.replace(/[%_,()]/g, "")}%,ean.eq.${filters.query.replace(/\D/g, "")}`,
    );
  if (filters.retailer) query = query.eq("retailers.slug", filters.retailer);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.active !== false) query = query.eq("active", true);
  const { data, error, count } = await query
    .order("last_seen_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error("Retailer products could not be loaded.");
  let products = (data ?? []).map(mapProduct);
  if (filters.promotion)
    products = products.filter((product) =>
      product.offers.some(
        (offer) =>
          offer.promotionalPrice !== null || offer.loyaltyPrice !== null,
      ),
    );
  return { products, total: count ?? products.length, page, pageSize };
}

export async function getRetailerProduct(id: string): Promise<RetailerProduct> {
  await requireOwner(`/products/${id}`);
  if (isTestAuthenticationEnabled())
    return (
      demoRetailerProducts.find((product) => product.id === id) ?? notFound()
    );
  const client = await createClient();
  const { data, error } = await client
    .from("retailer_products")
    .select(
      "*,retailers!inner(slug,display_name),retailer_offers(*),ingredient_product_matches(ingredient_id,confidence,review_status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) notFound();
  return mapProduct(data);
}

export async function listRetailers() {
  await requireOwner("/products");
  if (isTestAuthenticationEnabled()) return demoRetailers;
  const client = await createClient();
  const { data, error } = await client
    .from("retailers")
    .select("slug,display_name,enabled")
    .order("display_name");
  if (error) throw new Error("Retailers could not be loaded.");
  return (data ?? []).map((row) => ({
    slug: row.slug as RetailerSlug,
    displayName: row.display_name,
    enabled: row.enabled,
    isDemo: false,
  }));
}

export async function listComparisonProducts(
  ingredientIds: string[],
): Promise<RetailerProduct[]> {
  await requireOwner("/shopping-list");
  if (isTestAuthenticationEnabled())
    return demoRetailerProducts.filter(
      (product) =>
        product.active &&
        product.ingredientIds.some((id) => ingredientIds.includes(id)),
    );
  if (ingredientIds.length === 0) return [];
  const client = await createClient();
  const { data: matches, error: matchError } = await client
    .from("ingredient_product_matches")
    .select("retailer_product_id")
    .in("ingredient_id", ingredientIds)
    .neq("review_status", "rejected");
  if (matchError) return [];
  const productIds = [
    ...new Set((matches ?? []).map((match) => match.retailer_product_id)),
  ];
  if (productIds.length === 0) return [];
  const { data, error } = await client
    .from("retailer_products")
    .select(
      "*,retailers!inner(slug,display_name),retailer_offers(*),ingredient_product_matches(ingredient_id,confidence,review_status)",
    )
    .in("id", productIds)
    .eq("active", true);
  if (error) return [];
  return (data ?? []).map(mapProduct);
}

export async function getRetailerPreferences() {
  const defaults = defaultRetailerPreferences;
  await requireOwner("/products");
  if (isTestAuthenticationEnabled()) return defaults;
  const client = await createClient();
  const { data } = await client
    .from("user_preferences")
    .select(
      "enabled_retailers,preferred_retailer,allow_loyalty_prices,allow_split_basket,prefer_promotions,preferred_brands,excluded_brands",
    )
    .maybeSingle();
  if (!data) return defaults;
  return {
    enabledRetailers: data.enabled_retailers.filter(
      (slug: string): slug is RetailerSlug =>
        RETAILER_SLUGS.includes(slug as RetailerSlug),
    ),
    preferredRetailer: data.preferred_retailer as RetailerSlug | null,
    allowLoyaltyPrices: data.allow_loyalty_prices,
    allowSplitBasket: data.allow_split_basket,
    preferPromotions: data.prefer_promotions,
    preferredBrands: data.preferred_brands,
    excludedBrands: data.excluded_brands,
  };
}
