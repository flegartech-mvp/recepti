type JsonRecord = Record<string, unknown>;

const record = (value: unknown): JsonRecord =>
  typeof value === "object" && value !== null ? (value as JsonRecord) : {};

const rows = (value: unknown): JsonRecord[] =>
  Array.isArray(value) ? value.map(record) : [];

const textValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const nullableText = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const numberValue = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nullableNumber = (value: unknown): number | null =>
  value === null || value === undefined || value === ""
    ? null
    : numberValue(value);

const booleanValue = (value: unknown): boolean => value === true;

const stringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

function groupedBy(
  rowsToGroup: JsonRecord[],
  key: string,
): Map<string, JsonRecord[]> {
  const grouped = new Map<string, JsonRecord[]>();
  for (const row of rowsToGroup) {
    const id = textValue(row[key]);
    if (!id) continue;
    const group = grouped.get(id) ?? [];
    group.push(row);
    grouped.set(id, group);
  }
  return grouped;
}

/**
 * Converts the deliberately database-shaped RPC payload into Nana's Recipes'
 * stable,
 * camel-cased export contract. Keeping this adapter outside the route makes
 * schema validation testable without a Supabase connection.
 */
export function shapeCookbookExport(payload: unknown): unknown {
  const source = record(payload);
  if (
    (source.schemaVersion === 1 || source.schemaVersion === 2) &&
    source.product === "Nana's Recipes"
  ) {
    return payload;
  }
  const ingredientRows = rows(source.ingredients);
  const recipeRows = rows(source.recipes);
  const tagRows = rows(source.tags);
  const recipeIngredientRows = groupedBy(
    rows(source.recipe_ingredients),
    "recipe_id",
  );
  const recipeStepRows = groupedBy(rows(source.recipe_steps), "recipe_id");
  const recipeTagRows = groupedBy(rows(source.recipe_tags), "recipe_id");
  const ingredientsById = new Map(
    ingredientRows.map((item) => [textValue(item.id), item]),
  );
  const preferences = record(source.preferences);

  return {
    schemaVersion: numberValue(source.schema_version, 1),
    product: "Nana's Recipes",
    exportedAt: textValue(source.exported_at),
    ingredients: ingredientRows.map((item) => ({
      id: textValue(item.id),
      canonicalName: textValue(item.canonical_name),
      displayName: nullableText(item.display_name),
      normalizedName: textValue(item.normalized_name),
      category: textValue(item.category, "other"),
      defaultUnit: nullableText(item.default_unit),
      aliases: stringArray(item.aliases),
      isStaple: booleanValue(item.is_staple),
      notes: nullableText(item.notes),
      createdAt: textValue(item.created_at),
      updatedAt: textValue(item.updated_at),
    })),
    tags: tagRows.map((item) => ({
      id: textValue(item.id),
      name: textValue(item.name),
      normalizedName: textValue(item.normalized_name),
      type: textValue(item.type, "custom"),
      createdAt: textValue(item.created_at),
    })),
    recipes: recipeRows.map((item) => {
      const recipeId = textValue(item.id);
      return {
        id: recipeId,
        title: textValue(item.title),
        description: nullableText(item.description),
        imagePath: nullableText(item.image_path),
        category: textValue(item.category, "other"),
        cuisine: nullableText(item.cuisine),
        difficulty: nullableText(item.difficulty),
        prepMinutes: numberValue(item.prep_minutes),
        cookMinutes: numberValue(item.cook_minutes),
        restMinutes: numberValue(item.rest_minutes),
        servings: numberValue(item.servings, 2),
        sourceName: nullableText(item.source_name),
        sourceUrl: nullableText(item.source_url),
        notes: nullableText(item.notes),
        isFavorite: booleanValue(item.is_favorite),
        status: textValue(item.status, "draft"),
        cookedCount: numberValue(item.cooked_count),
        lastCookedAt: nullableText(item.last_cooked_at),
        createdAt: textValue(item.created_at),
        updatedAt: textValue(item.updated_at),
        ingredients: (recipeIngredientRows.get(recipeId) ?? [])
          .sort(
            (left, right) =>
              numberValue(left.sort_order) - numberValue(right.sort_order),
          )
          .map((row) => {
            const ingredient =
              ingredientsById.get(textValue(row.ingredient_id)) ?? {};
            const canonicalName = textValue(
              ingredient.canonical_name,
              "Ingredient",
            );
            return {
              id: textValue(row.id),
              ingredientId: textValue(row.ingredient_id),
              canonicalName,
              displayName:
                nullableText(row.display_name) ??
                nullableText(ingredient.display_name) ??
                canonicalName,
              quantity: nullableNumber(row.quantity),
              unit: nullableText(row.unit),
              customUnit: null,
              preparationNote: nullableText(row.preparation_note),
              isOptional: booleanValue(row.is_optional),
              isGarnish: booleanValue(row.is_garnish),
              sectionName: nullableText(row.section_name),
              sortOrder: numberValue(row.sort_order),
            };
          }),
        steps: (recipeStepRows.get(recipeId) ?? [])
          .sort(
            (left, right) =>
              numberValue(left.sort_order) - numberValue(right.sort_order),
          )
          .map((row) => ({
            id: textValue(row.id),
            instruction: textValue(row.instruction),
            timerMinutes:
              nullableNumber(row.timer_seconds) === null
                ? null
                : Math.max(1, Math.round(numberValue(row.timer_seconds) / 60)),
            imagePath: nullableText(row.image_path),
            sortOrder: numberValue(row.sort_order),
          })),
        tagIds: (recipeTagRows.get(recipeId) ?? []).map((row) =>
          textValue(row.tag_id),
        ),
      };
    }),
    pantryItems: rows(source.pantry_items).map((item) => ({
      id: textValue(item.id),
      ingredientId: textValue(item.ingredient_id),
      quantity: nullableNumber(item.quantity),
      unit: nullableText(item.unit),
      storageLocation: textValue(item.storage_location, "other"),
      expirationDate: nullableText(item.expiration_date),
      lowStock: booleanValue(item.low_stock),
      notes: nullableText(item.notes),
      createdAt: textValue(item.created_at),
      updatedAt: textValue(item.updated_at),
    })),
    shoppingListItems: rows(source.shopping_list_items).map((item) => ({
      id: textValue(item.id),
      ingredientId: nullableText(item.ingredient_id),
      customName: nullableText(item.custom_name),
      quantity: nullableNumber(item.quantity),
      unit: nullableText(item.unit),
      recipeId: nullableText(item.recipe_id),
      isCompleted: booleanValue(item.is_completed),
      completedAt: nullableText(item.completed_at),
      createdAt: textValue(item.created_at),
      updatedAt: textValue(item.updated_at),
    })),
    cookingHistory: rows(source.cooking_history).map((item) => ({
      id: textValue(item.id),
      recipeId: textValue(item.recipe_id),
      cookedAt: textValue(item.cooked_at),
      servings: numberValue(item.servings, 1),
      notes: nullableText(item.notes),
    })),
    settings: {
      theme: textValue(preferences.theme, "system"),
      defaultServings: numberValue(preferences.default_servings, 2),
      measurementPreference: textValue(
        preferences.measurement_preference,
        "original",
      ),
      stapleIngredientIds: stringArray(preferences.staple_ingredient_ids),
      additionalStapleNames: stringArray(preferences.additional_staple_names),
      reduceMotion: booleanValue(preferences.reduce_motion),
      enabledRetailers:
        stringArray(preferences.enabled_retailers).length > 0
          ? stringArray(preferences.enabled_retailers)
          : ["spar-si", "hofer-si", "lidl-si"],
      preferredRetailer: nullableText(preferences.preferred_retailer),
      allowLoyaltyPrices: booleanValue(preferences.allow_loyalty_prices),
      allowSplitBasket:
        preferences.allow_split_basket === undefined
          ? true
          : booleanValue(preferences.allow_split_basket),
      preferPromotions:
        preferences.prefer_promotions === undefined
          ? true
          : booleanValue(preferences.prefer_promotions),
      preferredBrands: stringArray(preferences.preferred_brands),
      excludedBrands: stringArray(preferences.excluded_brands),
    },
  };
}
