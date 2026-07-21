import { groceryProducts } from "../src/data/grocery-products";
import { pantryStarters } from "../src/data/pantry-starters";
import { RETAILER_SLUGS } from "../src/lib/retailers/types";

const supportedPackageUnits = new Set(["g", "ml", "piece"]);
const officialSourceHosts = new Set([
  "www.hofer.si",
  "www.lidl.si",
  "online.spar.si",
]);
const validRetailers = new Set<string>(RETAILER_SLUGS);
const validIngredientSlugs = new Set(
  pantryStarters.map((ingredient) => ingredient.slug),
);
const ids = new Set<string>();
const fingerprints = new Map<string, string>();
const counts = new Map<string, number>();

const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

for (const product of groceryProducts) {
  if (!product.id.trim())
    throw new Error("A catalogue product is missing its ID.");
  if (ids.has(product.id))
    throw new Error(`Duplicate product ID: ${product.id}`);
  ids.add(product.id);

  if (!product.name.trim())
    throw new Error(`${product.id} is missing its name.`);
  if (!validRetailers.has(product.retailerSlug)) {
    throw new Error(`${product.id} has an invalid retailer ID.`);
  }
  if (!product.ingredientSlugs.length) {
    throw new Error(`${product.id} needs an ingredient slug.`);
  }
  for (const slug of product.ingredientSlugs) {
    if (!validIngredientSlugs.has(slug)) {
      throw new Error(`${product.id} references unknown ingredient ${slug}.`);
    }
  }
  if (product.packageQuantity === null || product.packageQuantity <= 0) {
    throw new Error(`${product.id} has an invalid package quantity.`);
  }
  if (!product.packageUnit || !supportedPackageUnits.has(product.packageUnit)) {
    throw new Error(`${product.id} has an unsupported package unit.`);
  }
  if (!product.unitLabel?.trim()) {
    throw new Error(`${product.id} is missing its package label.`);
  }
  if (product.price !== null) {
    if (!Number.isFinite(product.price) || product.price <= 0) {
      throw new Error(`${product.id} has an invalid price.`);
    }
    if (!product.priceCheckedAt || !isIsoDate(product.priceCheckedAt)) {
      throw new Error(`${product.id} needs a valid priceCheckedAt date.`);
    }
  }
  if (!product.sourceCheckedAt || !isIsoDate(product.sourceCheckedAt)) {
    throw new Error(`${product.id} needs a valid sourceCheckedAt date.`);
  }
  if (!product.sourceUrl)
    throw new Error(`${product.id} needs an official source URL.`);
  const source = new URL(product.sourceUrl);
  if (
    source.protocol !== "https:" ||
    !officialSourceHosts.has(source.hostname)
  ) {
    throw new Error(`${product.id} has a non-official source URL.`);
  }

  const fingerprint = [
    product.retailerSlug,
    product.name.toLocaleLowerCase("sl"),
    product.brand?.toLocaleLowerCase("sl") ?? "",
    product.packageQuantity,
    product.packageUnit,
  ].join("|");
  const existing = fingerprints.get(fingerprint);
  if (existing) {
    throw new Error(
      `Suspicious duplicate products: ${existing} and ${product.id}`,
    );
  }
  fingerprints.set(fingerprint, product.id);
  counts.set(product.retailerSlug, (counts.get(product.retailerSlug) ?? 0) + 1);
}

for (const retailer of RETAILER_SLUGS) {
  const count = counts.get(retailer) ?? 0;
  if (count < 100)
    throw new Error(`${retailer} has only ${count} verified products.`);
}

console.log(
  `Catalogue valid: ${groceryProducts.length} products (${RETAILER_SLUGS.map(
    (retailer) => `${retailer}: ${counts.get(retailer) ?? 0}`,
  ).join(", ")}).`,
);
