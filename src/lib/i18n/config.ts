export const SUPPORTED_LOCALES = ["en", "sl"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "nanas-recipes-locale";
export const LOCALE_STORAGE_KEY = "nanas-recipes:locale";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "sl";
}

export function normalizeLocale(value: string | null | undefined): Locale {
  return value?.toLowerCase().startsWith("sl") ? "sl" : DEFAULT_LOCALE;
}

export function localeTag(locale: Locale) {
  return locale === "sl" ? "sl-SI" : "en-GB";
}
