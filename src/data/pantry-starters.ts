export const pantryStarters = [
  { slug: "egg", step: 1, unit: "piece" },
  { slug: "milk", step: 250, unit: "ml" },
  { slug: "pasta", step: 100, unit: "g" },
  { slug: "rice", step: 100, unit: "g" },
  { slug: "flour", step: 100, unit: "g" },
  { slug: "olive oil", step: 100, unit: "ml" },
  { slug: "salt", step: 1, unit: "g" },
] as const;

export function pantryAdjustmentStep(normalizedName: string, unit: string | null) {
  return pantryStarters.find((item) => item.slug === normalizedName)?.step ??
    (unit === "g" || unit === "ml" ? 100 : 1);
}
