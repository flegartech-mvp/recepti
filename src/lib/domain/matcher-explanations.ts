import type {
  IngredientMatchDetail,
  IngredientMatchStatus,
  MatchCategory,
  MatchExplanation,
  MatchExplanationCode,
} from "./matcher-types";

export function resultReason(
  category: MatchCategory,
  requiredCount: number,
  details: readonly IngredientMatchDetail[],
): string {
  if (requiredCount === 0) return "This recipe has no required ingredients.";
  const count = (statuses: IngredientMatchStatus[]) =>
    details.filter((detail) => statuses.includes(detail.status)).length;
  const missing = count(["missing"]);
  const excluded = count(["excluded"]);
  const quantityIssues = count(["insufficient_quantity", "incompatible_units"]);
  const substitutions = count(["substituted"]);
  if (category === "ready_to_cook")
    return `All ${requiredCount} required ingredient${requiredCount === 1 ? " is" : "s are"} available.`;
  if (category === "possible_with_substitutions")
    return `${substitutions} explicitly saved substitution${substitutions === 1 ? " makes" : "s make"} this recipe possible.`;
  const blockers = [
    missing > 0 ? `${missing} missing` : null,
    excluded > 0 ? `${excluded} excluded` : null,
    quantityIssues > 0
      ? `${quantityIssues} quantity issue${quantityIssues === 1 ? "" : "s"}`
      : null,
  ].filter((value): value is string => value != null);
  return category === "almost_ready"
    ? `Almost ready: ${blockers.join(", ")}.`
    : `Not enough ingredients yet: ${blockers.join(", ") || "no required ingredients are available"}.`;
}

export function buildExplanations(
  requiredCount: number,
  details: readonly IngredientMatchDetail[],
): MatchExplanation[] {
  const explanations: MatchExplanation[] = [];
  const count = (status: IngredientMatchStatus) =>
    details.filter((detail) => detail.status === status).length;
  if (requiredCount === 0)
    explanations.push({
      code: "no_required_ingredients",
      message:
        "Optional, garnish, and ignored staple rows do not create required work.",
    });
  else if (
    details.filter((detail) =>
      [
        "missing",
        "excluded",
        "insufficient_quantity",
        "incompatible_units",
        "substituted",
      ].includes(detail.status),
    ).length === 0
  )
    explanations.push({
      code: "complete_match",
      message:
        "Every required ingredient identity is available with no known shortage.",
    });

  const messages: Array<
    [IngredientMatchStatus, MatchExplanationCode, (amount: number) => string]
  > = [
    [
      "missing",
      "missing_ingredients",
      (amount) =>
        `${amount} required ingredient${amount === 1 ? " is" : "s are"} absent.`,
    ],
    [
      "excluded",
      "excluded_ingredients",
      (amount) =>
        `${amount} required ingredient${amount === 1 ? " was" : "s were"} explicitly excluded.`,
    ],
    [
      "insufficient_quantity",
      "insufficient_quantity",
      (amount) =>
        `${amount} ingredient${amount === 1 ? " has" : "s have"} a known quantity shortage.`,
    ],
    [
      "incompatible_units",
      "incompatible_units",
      (amount) =>
        `${amount} quantity comparison${amount === 1 ? " is" : "s are"} unsafe because the units are incompatible.`,
    ],
    [
      "substituted",
      "substitutions_used",
      (amount) =>
        `${amount} explicitly stored substitution${amount === 1 ? " is" : "s are"} available.`,
    ],
    [
      "ignored_optional",
      "optional_ignored",
      (amount) =>
        `${amount} optional or garnish ingredient${amount === 1 ? " does" : "s do"} not reduce the score.`,
    ],
    [
      "ignored_staple",
      "staples_ignored",
      (amount) =>
        `${amount} staple ingredient${amount === 1 ? " was" : "s were"} ignored by preference.`,
    ],
  ];
  for (const [status, code, message] of messages) {
    const amount = count(status);
    if (amount > 0) explanations.push({ code, message: message(amount) });
  }
  if (details.some((detail) => detail.quantityStatus === "unknown"))
    explanations.push({
      code: "unknown_quantities",
      message:
        "At least one pantry quantity is unknown, so that ingredient was matched by identity only.",
    });
  return explanations;
}
