import type { RecipeMatchResult } from "@/lib/domain";
import type { TranslationParams } from "@/lib/i18n/translate";

type MatchCopyTools = {
  t: (source: string, params?: TranslationParams) => string;
  plural: (
    count: number,
    forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
  ) => string;
  formatList: (values: string[]) => string;
};

export function getMatchReason(
  result: RecipeMatchResult,
  { t, plural, formatList }: MatchCopyTools,
) {
  if (result.requiredIngredientCount === 0) {
    return t("This recipe has no required ingredients.");
  }
  if (result.category === "ready_to_cook") {
    return plural(result.requiredIngredientCount, {
      one: "All {count} required ingredient is available.",
      two: "All {count} required ingredients are available.-two",
      few: "All {count} required ingredients are available.-few",
      other: "All {count} required ingredients are available.",
    });
  }
  if (result.category === "possible_with_substitutions") {
    return plural(result.substitutionsUsed.length, {
      one: "{count} saved substitution makes this recipe possible.",
      two: "{count} saved substitutions make this recipe possible.-two",
      few: "{count} saved substitutions make this recipe possible.-few",
      other: "{count} saved substitutions make this recipe possible.",
    });
  }

  const missing = result.ingredientDetails.filter(
    (detail) => detail.status === "missing",
  ).length;
  const excluded = result.ingredientDetails.filter(
    (detail) => detail.status === "excluded",
  ).length;
  const quantityIssues = result.quantityIssues.length;
  const blockers = [
    missing
      ? plural(missing, {
          one: "{count} missing ingredient",
          two: "{count} missing ingredients-two",
          few: "{count} missing ingredients-few",
          other: "{count} missing ingredients",
        })
      : null,
    excluded
      ? plural(excluded, {
          one: "{count} excluded ingredient",
          two: "{count} excluded ingredients-two",
          few: "{count} excluded ingredients-few",
          other: "{count} excluded ingredients",
        })
      : null,
    quantityIssues
      ? plural(quantityIssues, {
          one: "{count} quantity issue",
          two: "{count} quantity issues-two",
          few: "{count} quantity issues-few",
          other: "{count} quantity issues",
        })
      : null,
  ].filter((value): value is string => Boolean(value));

  const blockerText = blockers.length
    ? formatList(blockers)
    : t("no required ingredients are available");
  return result.category === "almost_ready"
    ? t("Almost ready: {blockers}.", { blockers: blockerText })
    : t("Not enough ingredients yet: {blockers}.", {
        blockers: blockerText,
      });
}
