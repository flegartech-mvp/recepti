export const KNOWN_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "piece",
  "clove",
  "pinch",
  "slice",
  "can",
  "packet",
  "bunch",
  "handful",
  "to taste",
] as const;

export type KnownUnit = (typeof KNOWN_UNITS)[number];
export type UnitFamily = "mass" | "metric-volume" | "spoon-volume";

interface ConvertibleUnitDefinition {
  family: UnitFamily;
  /** Multiplier into the deliberately narrow family's base unit. */
  factor: number;
}

const CONVERTIBLE_UNITS: Readonly<Record<string, ConvertibleUnitDefinition>> = {
  g: { family: "mass", factor: 1 },
  kg: { family: "mass", factor: 1_000 },
  ml: { family: "metric-volume", factor: 1 },
  l: { family: "metric-volume", factor: 1_000 },
  tsp: { family: "spoon-volume", factor: 1 },
  tbsp: { family: "spoon-volume", factor: 3 },
};

const UNIT_ALIASES: Readonly<Record<string, string>> = {
  gram: "g",
  grams: "g",
  kilogram: "kg",
  kilograms: "kg",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cups: "cup",
  pieces: "piece",
  pcs: "piece",
  pc: "piece",
  cloves: "clove",
  pinches: "pinch",
  slices: "slice",
  cans: "can",
  packets: "packet",
  packs: "packet",
  bunches: "bunch",
  handfuls: "handful",
  "to-taste": "to taste",
  "as needed": "to taste",
};

export function normalizeUnit(unit: string | null | undefined): string | null {
  if (unit == null) {
    return null;
  }

  const normalized = unit
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\.$/, "");

  if (!normalized) {
    return null;
  }

  return UNIT_ALIASES[normalized] ?? normalized;
}

export function getUnitFamily(
  unit: string | null | undefined,
): UnitFamily | null {
  const normalized = normalizeUnit(unit);
  return normalized ? (CONVERTIBLE_UNITS[normalized]?.family ?? null) : null;
}

export function areUnitsCompatible(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const normalizedLeft = normalizeUnit(left);
  const normalizedRight = normalizeUnit(right);

  if (normalizedLeft === normalizedRight) {
    return true;
  }

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  const leftDefinition = CONVERTIBLE_UNITS[normalizedLeft];
  const rightDefinition = CONVERTIBLE_UNITS[normalizedRight];
  return Boolean(
    leftDefinition &&
    rightDefinition &&
    leftDefinition.family === rightDefinition.family,
  );
}

/**
 * Converts only within explicitly approved pairs. In particular, metric volume
 * and spoon volume remain separate; cups-to-grams and similar culinary guesses
 * are never attempted.
 */
export function convertQuantity(
  quantity: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  if (!Number.isFinite(quantity)) {
    return null;
  }

  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (from === to) {
    return quantity;
  }

  if (!from || !to) {
    return null;
  }

  const fromDefinition = CONVERTIBLE_UNITS[from];
  const toDefinition = CONVERTIBLE_UNITS[to];

  if (
    !fromDefinition ||
    !toDefinition ||
    fromDefinition.family !== toDefinition.family
  ) {
    return null;
  }

  return (quantity * fromDefinition.factor) / toDefinition.factor;
}

export type QuantityComparisonStatus =
  "not_applicable" | "unknown" | "sufficient" | "insufficient" | "incompatible";

export interface QuantityComparison {
  status: QuantityComparisonStatus;
  availableInRequiredUnit: number | null;
  deficit: number | null;
  ratio: number | null;
}

export function compareQuantities(
  requiredQuantity: number | null | undefined,
  requiredUnit: string | null | undefined,
  availableQuantity: number | null | undefined,
  availableUnit: string | null | undefined,
): QuantityComparison {
  if (requiredQuantity == null) {
    return {
      status: "not_applicable",
      availableInRequiredUnit: null,
      deficit: null,
      ratio: null,
    };
  }

  if (availableQuantity == null) {
    return {
      status: "unknown",
      availableInRequiredUnit: null,
      deficit: null,
      ratio: null,
    };
  }

  const converted = convertQuantity(
    availableQuantity,
    availableUnit,
    requiredUnit,
  );
  if (converted == null) {
    return {
      status: "incompatible",
      availableInRequiredUnit: null,
      deficit: null,
      ratio: null,
    };
  }

  const deficit = Math.max(0, requiredQuantity - converted);
  const ratio =
    requiredQuantity === 0 ? 1 : Math.max(0, converted / requiredQuantity);

  return {
    status:
      deficit <= Number.EPSILON * Math.max(1, requiredQuantity)
        ? "sufficient"
        : "insufficient",
    availableInRequiredUnit: converted,
    deficit,
    ratio,
  };
}

const UNICODE_FRACTIONS: Readonly<Record<string, number>> = {
  "⅛": 1 / 8,
  "⅙": 1 / 6,
  "¼": 1 / 4,
  "⅓": 1 / 3,
  "⅜": 3 / 8,
  "½": 1 / 2,
  "⅝": 5 / 8,
  "⅔": 2 / 3,
  "¾": 3 / 4,
  "⅚": 5 / 6,
  "⅞": 7 / 8,
};

export function parseQuantity(
  input: string | number | null | undefined,
): number | null {
  if (input == null || input === "") {
    return null;
  }

  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }

  let value = input.trim();
  if (!value) {
    return null;
  }

  let unicodeFraction = 0;
  const lastCharacter = value.at(-1);
  if (lastCharacter && UNICODE_FRACTIONS[lastCharacter] != null) {
    unicodeFraction = UNICODE_FRACTIONS[lastCharacter];
    value = value.slice(0, -1).trim();
  }

  const mixedFraction = value.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFraction) {
    const whole = Number(mixedFraction[1]);
    const numerator = Number(mixedFraction[2]);
    const denominator = Number(mixedFraction[3]);
    if (denominator === 0 || numerator >= denominator) {
      return null;
    }
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (numerator / denominator) + sign * unicodeFraction;
  }

  const fraction = value.match(/^([+-]?\d+)\/(\d+)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : numerator / denominator + unicodeFraction;
  }

  if (value === "" && unicodeFraction > 0) {
    return unicodeFraction;
  }

  // A single comma is accepted as a decimal separator for localized entry.
  if (/^[+-]?\d+,\d+$/.test(value)) {
    value = value.replace(",", ".");
  }

  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed + unicodeFraction : null;
}

export interface FormatQuantityOptions {
  locale?: string;
  maximumFractionDigits?: number;
  preferFractions?: boolean;
  fractionTolerance?: number;
}

const DISPLAY_FRACTIONS = Object.entries(UNICODE_FRACTIONS)
  .map(([glyph, value]) => ({ glyph, value }))
  .sort((left, right) => left.value - right.value);

export function formatQuantity(
  quantity: number | null | undefined,
  options: FormatQuantityOptions = {},
): string {
  if (quantity == null || !Number.isFinite(quantity)) {
    return "";
  }

  const {
    locale = "en-US",
    maximumFractionDigits = 2,
    preferFractions = true,
    fractionTolerance = 0.012,
  } = options;

  if (preferFractions) {
    const sign = quantity < 0 ? "−" : "";
    const absolute = Math.abs(quantity);
    let whole = Math.floor(absolute);
    const remainder = absolute - whole;
    const fraction = DISPLAY_FRACTIONS.find(
      (candidate) => Math.abs(candidate.value - remainder) <= fractionTolerance,
    );

    if (fraction) {
      return `${sign}${whole > 0 ? `${whole} ` : ""}${fraction.glyph}`;
    }

    if (Math.abs(remainder - 1) <= fractionTolerance) {
      whole += 1;
      return `${sign}${whole}`;
    }

    if (remainder <= fractionTolerance) {
      return `${sign}${whole}`;
    }
  }

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
    useGrouping: false,
  }).format(quantity);
}

export function scaleQuantity(
  quantity: number | null | undefined,
  baseServings: number,
  targetServings: number,
): number | null {
  if (quantity == null) {
    return null;
  }

  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(baseServings) ||
    !Number.isFinite(targetServings) ||
    baseServings <= 0 ||
    targetServings <= 0
  ) {
    throw new RangeError(
      "Servings and quantity must be finite, and servings must be positive.",
    );
  }

  return quantity * (targetServings / baseServings);
}

export function formatScaledQuantity(
  quantity: number | null | undefined,
  baseServings: number,
  targetServings: number,
  options?: FormatQuantityOptions,
): string {
  return formatQuantity(
    scaleQuantity(quantity, baseServings, targetServings),
    options,
  );
}
