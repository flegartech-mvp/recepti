import "server-only";

import { cookies } from "next/headers";

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/lib/i18n/config";
import {
  formatDate,
  formatList,
  formatNumber,
  plural,
  translate,
  type TranslationParams,
} from "@/lib/i18n/translate";

export async function getServerLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function getServerLocaleState() {
  const value = (await cookies()).get(LOCALE_COOKIE_NAME)?.value;
  return {
    locale: isLocale(value) ? value : DEFAULT_LOCALE,
    hasPreference: isLocale(value),
  };
}

export async function getServerI18n() {
  const locale = await getServerLocale();
  return {
    locale,
    t: (source: string, params?: TranslationParams) =>
      translate(locale, source, params),
    formatDate: (
      value: Date | string | number,
      options?: Intl.DateTimeFormatOptions,
    ) => formatDate(locale, value, options),
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(locale, value, options),
    formatList: (values: string[]) => formatList(locale, values),
    plural: (
      count: number,
      forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
    ) => plural(locale, count, forms),
  };
}
