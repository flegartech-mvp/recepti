export interface RecipeEditorRowIndexes {
  ingredients: number[];
  steps: number[];
}

interface ValidationIssue {
  path: readonly PropertyKey[];
  message: string;
}

/**
 * Zod validates the compact recipe payload after intentionally blank editor
 * rows have been removed. Translate compact array positions back to the field
 * array positions so an inline error always appears on the row that caused it.
 */
export function collectRecipeEditorValidationMessages(
  issues: readonly ValidationIssue[],
  rowIndexes?: RecipeEditorRowIndexes,
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const issue of issues) {
    const path = [...issue.path];
    const collection = path[0];
    const compactIndex = path[1];
    if (
      rowIndexes &&
      (collection === "ingredients" || collection === "steps") &&
      typeof compactIndex === "number"
    ) {
      path[1] = rowIndexes[collection][compactIndex] ?? compactIndex;
    }
    const key = path.map(String).join(".") || "form";
    messages[key] ??= issue.message;
  }
  return messages;
}
