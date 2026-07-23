import {
  isTestAuthenticationEnabled,
  requireOwner,
} from "@/lib/auth/authorization";
import {
  corruptDataError,
  dataAccessError,
} from "@/lib/errors/application-error";
import { createClient } from "@/lib/supabase/server";
import { settingsSchema, type SettingsValues } from "@/lib/validation";

export const DEFAULT_SETTINGS: SettingsValues = {
  theme: "system",
  defaultServings: 2,
  measurementPreference: "original",
  stapleIngredientIds: [],
  additionalStapleNames: [],
  reduceMotion: false,
  enabledRetailers: ["spar-si", "hofer-si", "lidl-si"],
  preferredRetailer: null,
  allowLoyaltyPrices: false,
  allowSplitBasket: false,
  preferPromotions: false,
  preferredBrands: [],
  excludedBrands: [],
};

function settingsDefaults(): SettingsValues {
  return {
    ...DEFAULT_SETTINGS,
    stapleIngredientIds: [],
    additionalStapleNames: [],
    enabledRetailers: [...DEFAULT_SETTINGS.enabledRetailers],
    preferredBrands: [],
    excludedBrands: [],
  };
}

export function parseUserSettingsRow(
  data: Record<string, unknown> | null,
): SettingsValues {
  if (data === null) return settingsDefaults();
  const parsed = settingsSchema.safeParse({
    theme: data.theme,
    defaultServings: Number(data.default_servings),
    measurementPreference: data.measurement_preference,
    stapleIngredientIds: data.staple_ingredient_ids,
    additionalStapleNames: data.additional_staple_names,
    reduceMotion: data.reduce_motion,
    enabledRetailers: data.enabled_retailers,
    preferredRetailer: data.preferred_retailer,
    allowLoyaltyPrices: data.allow_loyalty_prices,
    allowSplitBasket: data.allow_split_basket,
    preferPromotions: data.prefer_promotions,
    preferredBrands: data.preferred_brands,
    excludedBrands: data.excluded_brands,
  });
  if (!parsed.success)
    throw corruptDataError("load user settings", parsed.error);
  return parsed.data;
}

export async function getUserSettings(): Promise<SettingsValues> {
  await requireOwner("/settings");
  if (isTestAuthenticationEnabled()) return settingsDefaults();

  const client = await createClient();
  const { data, error } = await client
    .from("user_preferences")
    .select(
      "theme,default_servings,measurement_preference,staple_ingredient_ids,additional_staple_names,reduce_motion,enabled_retailers,preferred_retailer,allow_loyalty_prices,allow_split_basket,prefer_promotions,preferred_brands,excluded_brands",
    )
    .maybeSingle();

  if (error) throw dataAccessError("load user settings", error);
  return parseUserSettingsRow(data);
}
