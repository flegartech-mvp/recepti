"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import {
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
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

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (source: string, params?: TranslationParams) => string;
  formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatList: (values: string[]) => string;
  plural: (
    count: number,
    forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
  ) => string;
};

const fallbackContext: I18nContextValue = {
  locale: "en",
  setLocale: () => undefined,
  t: (source, params) => translate("en", source, params),
  formatDate: (value, options) => formatDate("en", value, options),
  formatNumber: (value, options) => formatNumber("en", value, options),
  formatList: (values) => formatList("en", values),
  plural: (count, forms) => plural("en", count, forms),
};

const I18nContext = createContext<I18nContextValue>(fallbackContext);

function persistLocale(locale: Locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = locale;
}

export function I18nProvider({
  children,
  initialLocale,
  hasLocalePreference,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  hasLocalePreference: boolean;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    let cancelled = false;
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const detected = isLocale(stored)
      ? stored
      : hasLocalePreference
        ? initialLocale
        : normalizeLocale(navigator.languages?.[0] ?? navigator.language);
    persistLocale(detected);
    if (detected !== initialLocale) {
      queueMicrotask(() => {
        if (cancelled) return;
        setLocaleState(detected);
        router.refresh();
      });
    }
    return () => {
      cancelled = true;
    };
  }, [hasLocalePreference, initialLocale, router]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      persistLocale(nextLocale);
      setLocaleState(nextLocale);
      router.refresh();
    },
    [router],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (source, params) => translate(locale, source, params),
      formatDate: (date, options) => formatDate(locale, date, options),
      formatNumber: (number, options) => formatNumber(locale, number, options),
      formatList: (values) => formatList(locale, values),
      plural: (count, forms) => plural(locale, count, forms),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
