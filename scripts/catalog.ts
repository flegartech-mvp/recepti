import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

import { retailerAdapters } from "../src/lib/retailers/adapters";
import {
  parseCatalogCsv,
  parseCatalogJson,
  sourceHash,
} from "../src/lib/retailers/importer";
import {
  RETAILER_SLUGS,
  type NormalizedRetailerProduct,
  type RetailerSlug,
} from "../src/lib/retailers/types";

const args = process.argv.slice(2);
const command = args[0] ?? "help";
const option = (name: string) =>
  args
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);
const hasFlag = (name: string) => args.includes(`--${name}`);

function help() {
  console.log(`Nana's Recipes retailer catalogue

Usage:
  pnpm catalog:validate --retailer=spar-si --file=./examples/catalog/spar-si.sample.json
  pnpm catalog:import --retailer=hofer-si --file=./imports/hofer.csv [--apply]
  pnpm catalog:seed
  pnpm catalog:sync --retailer=lidl-si

Imports are dry-run by default. --apply additionally requires:
  RETAILER_IMPORTS_ENABLED=1
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  CATALOG_SUPABASE_ACCESS_TOKEN (an owner session JWT, never commit it)

Live sync remains disabled until an authorized feed is configured.`);
}

function retailer(): RetailerSlug {
  const value = option("retailer");
  if (!value || !RETAILER_SLUGS.includes(value as RetailerSlug))
    throw new Error(`--retailer must be one of ${RETAILER_SLUGS.join(", ")}.`);
  return value as RetailerSlug;
}

async function loadProducts(file: string, slug: RetailerSlug) {
  const contents = await readFile(resolve(file), "utf8");
  const allowedHosts = (process.env.RETAILER_ALLOWED_SOURCE_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  return file.toLocaleLowerCase("en-US").endsWith(".csv")
    ? parseCatalogCsv(contents, slug, allowedHosts)
    : parseCatalogJson(contents, slug, allowedHosts);
}

function report(result: Awaited<ReturnType<typeof loadProducts>>) {
  console.log(`Valid: ${result.products.length}`);
  console.log(`Invalid: ${result.errors.length}`);
  result.errors
    .slice(0, 20)
    .forEach((error) => console.error(`Row ${error.row}: ${error.message}`));
}

async function applyProducts(
  slug: RetailerSlug,
  products: NormalizedRetailerProduct[],
  sourceIdentifier: string,
) {
  if (process.env.RETAILER_IMPORTS_ENABLED !== "1")
    throw new Error("RETAILER_IMPORTS_ENABLED=1 is required for --apply.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const accessToken = process.env.CATALOG_SUPABASE_ACCESS_TOKEN;
  if (!url || !anonKey || !accessToken)
    throw new Error(
      "Supabase URL, anon key, and an owner CATALOG_SUPABASE_ACCESS_TOKEN are required.",
    );
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: retailerRow, error: retailerError } = await client
    .from("retailers")
    .select("id")
    .eq("slug", slug)
    .single();
  if (retailerError) throw retailerError;
  const { data: run, error: runError } = await client
    .from("retailer_import_runs")
    .insert({
      retailer_id: retailerRow.id,
      import_mode: sourceIdentifier.endsWith(".csv") ? "csv" : "json",
      source_identifier: sourceIdentifier,
      records_seen: products.length,
    })
    .select("id")
    .single();
  if (runError) throw runError;
  let inserted = 0;
  let updated = 0;
  let failed = 0;
  for (const product of products) {
    try {
      const payloadHash = sourceHash(product);
      const { data: existing } = await client
        .from("retailer_products")
        .select("id")
        .eq("retailer_id", retailerRow.id)
        .eq("external_id", product.externalId)
        .maybeSingle();
      const { data: saved, error } = await client
        .from("retailer_products")
        .upsert(
          {
            retailer_id: retailerRow.id,
            external_id: product.externalId,
            sku: product.sku ?? null,
            ean: product.ean ?? null,
            name: product.name,
            normalized_name: product.normalizedName,
            brand: product.brand ?? null,
            description: product.description ?? null,
            category: product.category ?? null,
            subcategory: product.subcategory ?? null,
            package_quantity: product.packageQuantity ?? null,
            package_unit: product.packageUnit ?? null,
            package_text: product.packageText ?? null,
            country_of_origin: product.countryOfOrigin ?? null,
            source_url: product.sourceUrl ?? null,
            source_image_url: product.sourceImageUrl ?? null,
            image_mode: product.imageMode,
            active: product.active,
            last_seen_at: product.observedAt,
            source_payload_hash: payloadHash,
          },
          { onConflict: "retailer_id,external_id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      if (existing) updated += 1;
      else inserted += 1;
      if (
        product.price !== undefined ||
        product.promotionalPrice !== undefined ||
        product.loyaltyPrice !== undefined
      ) {
        const offer = {
          retailer_product_id: saved.id,
          currency: "EUR",
          regular_price: product.price ?? null,
          promotional_price: product.promotionalPrice ?? null,
          loyalty_price: product.loyaltyPrice ?? null,
          unit_price: product.unitPrice ?? null,
          unit_price_unit: product.unitPriceUnit ?? null,
          valid_from: product.validFrom ?? null,
          valid_until: product.validUntil ?? null,
          availability_status: "unknown",
          promotion_label: product.promotionLabel ?? null,
          observed_at: product.observedAt,
          source_hash: sourceHash({
            product: product.externalId,
            prices: [
              product.price,
              product.promotionalPrice,
              product.loyaltyPrice,
            ],
            validity: [product.validFrom, product.validUntil],
          }),
        };
        const { error: offerError } = await client
          .from("retailer_offers")
          .upsert(offer, {
            onConflict: "retailer_product_id,store_id,source_hash",
          });
        if (offerError) throw offerError;
      }
    } catch (error) {
      failed += 1;
      await client.from("retailer_import_errors").insert({
        import_run_id: run.id,
        error_message:
          error instanceof Error
            ? error.message.slice(0, 1_000)
            : "Unknown import error",
      });
    }
  }
  const status =
    failed === 0
      ? "succeeded"
      : failed < products.length
        ? "partial"
        : "failed";
  await client
    .from("retailer_import_runs")
    .update({
      completed_at: new Date().toISOString(),
      status,
      records_inserted: inserted,
      records_updated: updated,
      records_failed: failed,
    })
    .eq("id", run.id);
  console.log(
    `Applied: ${inserted} inserted, ${updated} updated, ${failed} failed. No stale products were deleted.`,
  );
}

async function main() {
  if (command === "help" || hasFlag("help")) return help();
  if (command === "seed") {
    for (const slug of RETAILER_SLUGS) {
      const extension = slug === "hofer-si" ? "csv" : "json";
      const result = await loadProducts(
        `examples/catalog/${slug}.sample.${extension}`,
        slug,
      );
      console.log(
        `${slug}: ${result.products.length} fixture products validated`,
      );
      if (result.errors.length) process.exitCode = 1;
    }
    return;
  }
  if (command === "sync") {
    const slug = retailer();
    const adapter = retailerAdapters.find((item) => item.slug === slug)!;
    const feedUrl = process.env[adapter.environmentUrlKey];
    if (process.env.RETAILER_IMPORTS_ENABLED !== "1" || !feedUrl)
      throw new Error(
        `${slug} authorized feed is not configured. Use CSV/JSON import or fixtures.`,
      );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      await adapter.sync({
        signal: controller.signal,
        feedUrl,
        apiKey: process.env[adapter.environmentApiKey],
      });
    } finally {
      clearTimeout(timeout);
    }
    return;
  }
  if (command === "validate" || command === "import") {
    const slug = retailer();
    const file = option("file");
    if (!file) throw new Error("--file is required.");
    const result = await loadProducts(file, slug);
    report(result);
    if (!result.products.length || result.errors.length) process.exitCode = 1;
    if (command === "import" && hasFlag("apply") && result.products.length)
      await applyProducts(slug, result.products, file);
    else if (command === "import")
      console.log(
        "Dry-run only. Add --apply with explicit owner credentials to write validated rows.",
      );
    return;
  }
  help();
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
