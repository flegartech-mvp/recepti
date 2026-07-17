import { normalizeSlovenianText } from "./normalization";
import type { PackageUnit, RetailerProduct, RetailerSlug } from "./types";

const observedAt = "2026-07-15T08:00:00.000Z";
const retailerNames: Record<RetailerSlug, string> = {
  "spar-si": "SPAR Slovenija",
  "hofer-si": "HOFER Slovenija",
  "lidl-si": "Lidl Slovenija",
};

interface DemoProductInput {
  id: string;
  retailer: RetailerSlug;
  name: string;
  brand?: string;
  category: string;
  quantity?: number;
  unit?: PackageUnit;
  packageText: string;
  regular: number;
  promotion?: number;
  loyalty?: number;
  ingredientIds?: string[];
  active?: boolean;
  validFrom?: string;
  validUntil?: string;
  ean?: string;
}

function product(input: DemoProductInput): RetailerProduct {
  const offerId = `${input.id}-offer`;
  return {
    id: input.id,
    retailerId: `retailer-${input.retailer}`,
    retailerSlug: input.retailer,
    retailerName: retailerNames[input.retailer],
    externalId: `demo-${input.id}`,
    sku: `DEMO-${input.id.toLocaleUpperCase("en-US")}`,
    ean: input.ean ?? null,
    name: input.name,
    normalizedName: normalizeSlovenianText(input.name),
    brand: input.brand ?? null,
    description:
      "Fictional development product for catalogue and price-comparison testing.",
    category: input.category,
    subcategory: null,
    packageQuantity: input.quantity ?? null,
    packageUnit: input.unit ?? null,
    packageText: input.packageText,
    sourceUrl: null,
    sourceImageUrl: null,
    imageMode: "local-placeholder",
    active: input.active ?? true,
    lastSeenAt: observedAt,
    isDemo: true,
    ingredientIds: input.ingredientIds ?? [],
    matchConfidence: input.ingredientIds?.length ? 0.92 : null,
    offers: [
      {
        id: offerId,
        regularPrice: input.regular,
        promotionalPrice: input.promotion ?? null,
        loyaltyPrice: input.loyalty ?? null,
        currency: "EUR",
        unitPrice: input.quantity
          ? Number((input.regular / input.quantity).toFixed(4))
          : null,
        unitPriceUnit: input.unit ?? null,
        validFrom: input.validFrom ?? "2026-07-01T00:00:00.000Z",
        validUntil: input.validUntil ?? "2027-07-31T23:59:59.000Z",
        promotionLabel: input.promotion
          ? "Demo promotion"
          : input.loyalty
            ? "Demo loyalty price"
            : null,
        observedAt,
      },
    ],
  };
}

export const demoRetailerProducts: RetailerProduct[] = [
  product({
    id: "spar-milk",
    retailer: "spar-si",
    name: "Polnomastno mleko 3,5 %",
    brand: "Domača izbira",
    category: "Dairy",
    quantity: 1,
    unit: "l",
    packageText: "1 l",
    regular: 1.29,
    promotion: 1.09,
    ean: "3830000000006",
  }),
  product({
    id: "spar-flour",
    retailer: "spar-si",
    name: "Gladka pšenična moka tip 500",
    brand: "Mlin ob reki",
    category: "Baking",
    quantity: 1,
    unit: "kg",
    packageText: "1 kg",
    regular: 0.99,
  }),
  product({
    id: "spar-eggs",
    retailer: "spar-si",
    name: "Jajca iz hlevske reje M",
    brand: "Jutranja kmetija",
    category: "Eggs",
    quantity: 10,
    unit: "piece",
    packageText: "10 kos",
    regular: 2.79,
    ingredientIds: ["i-egg"],
  }),
  product({
    id: "spar-butter",
    retailer: "spar-si",
    name: "Slovensko maslo",
    brand: "Planinski dom",
    category: "Dairy",
    quantity: 250,
    unit: "g",
    packageText: "250 g",
    regular: 2.59,
    loyalty: 2.19,
  }),
  product({
    id: "spar-tomatoes",
    retailer: "spar-si",
    name: "Paradižnik v grozdu",
    category: "Produce",
    quantity: 500,
    unit: "g",
    packageText: "pakiranje 500 g",
    regular: 2.49,
    ingredientIds: ["i-tomato"],
  }),
  product({
    id: "spar-pasta",
    retailer: "spar-si",
    name: "Bronasti linguine",
    brand: "Casa Verde",
    category: "Pasta",
    quantity: 500,
    unit: "g",
    packageText: "500 g",
    regular: 1.89,
    promotion: 1.49,
    ingredientIds: ["i-pasta"],
  }),
  product({
    id: "hofer-oats",
    retailer: "hofer-si",
    name: "Polnozrnati ovseni kosmiči",
    brand: "Zlato jutro",
    category: "Grains",
    quantity: 1,
    unit: "kg",
    packageText: "1 kg",
    regular: 1.69,
    ingredientIds: ["i-oats"],
  }),
  product({
    id: "hofer-bananas",
    retailer: "hofer-si",
    name: "Banane, razred I",
    category: "Produce",
    quantity: 1,
    unit: "kg",
    packageText: "cena za kg",
    regular: 1.39,
    promotion: 1.19,
    ingredientIds: ["i-banana"],
  }),
  product({
    id: "hofer-rice",
    retailer: "hofer-si",
    name: "Dolgozrnati riž",
    brand: "Polje",
    category: "Grains",
    quantity: 1,
    unit: "kg",
    packageText: "1 kg",
    regular: 1.99,
    ingredientIds: ["i-rice"],
  }),
  product({
    id: "hofer-chicken",
    retailer: "hofer-si",
    name: "Piščančji file, družinsko pakiranje",
    brand: "Kmetija Plus",
    category: "Meat",
    quantity: 600,
    unit: "g",
    packageText: "pribl. 600 g",
    regular: 5.89,
    ingredientIds: ["i-chicken"],
  }),
  product({
    id: "hofer-yogurt",
    retailer: "hofer-si",
    name: "Grški tip jogurta 10 %",
    brand: "Helena",
    category: "Dairy",
    quantity: 400,
    unit: "g",
    packageText: "400 g",
    regular: 1.79,
    loyalty: 1.49,
  }),
  product({
    id: "hofer-skuta",
    retailer: "hofer-si",
    name: "Sveža nepasirana skuta",
    brand: "Planinski dom",
    category: "Dairy",
    quantity: 500,
    unit: "g",
    packageText: "500 g",
    regular: 2.29,
    active: false,
  }),
  product({
    id: "lidl-oil",
    retailer: "lidl-si",
    name: "Ekstra deviško oljčno olje",
    brand: "Oliveto",
    category: "Oils",
    quantity: 750,
    unit: "ml",
    packageText: "0,75 l",
    regular: 7.49,
    promotion: 6.49,
    ingredientIds: ["i-oil"],
  }),
  product({
    id: "lidl-tuna",
    retailer: "lidl-si",
    name: "Tuna v lastnem soku 3 x 80 g",
    brand: "Mare Blu",
    category: "Canned goods",
    quantity: 240,
    unit: "g",
    packageText: "3 x 80 g",
    regular: 3.49,
  }),
  product({
    id: "lidl-bread",
    retailer: "lidl-si",
    name: "Kmečki kruh z drožmi",
    brand: "Dnevna peč",
    category: "Bakery",
    quantity: 500,
    unit: "g",
    packageText: "500 g",
    regular: 2.19,
  }),
  product({
    id: "lidl-mozzarella",
    retailer: "lidl-si",
    name: "Mozzarella v slanici",
    brand: "Bellina",
    category: "Dairy",
    quantity: 125,
    unit: "g",
    packageText: "125 g",
    regular: 0.99,
    promotion: 0.79,
  }),
  product({
    id: "lidl-basil",
    retailer: "lidl-si",
    name: "Sveža bazilika v lončku",
    category: "Herbs",
    quantity: 1,
    unit: "piece",
    packageText: "1 lonček",
    regular: 1.59,
  }),
  product({
    id: "lidl-irregular",
    retailer: "lidl-si",
    name: "Sezonski zabojček zelenjave",
    category: "Produce",
    packageText: "mešana velikost",
    regular: 4.99,
    validUntil: "2026-06-30T23:59:59.000Z",
  }),
];

export const demoRetailers = Object.entries(retailerNames).map(
  ([slug, displayName]) => ({
    slug: slug as RetailerSlug,
    displayName,
    enabled: true,
    isDemo: true,
  }),
);
