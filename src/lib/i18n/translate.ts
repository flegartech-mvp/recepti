import { localeTag, type Locale } from "@/lib/i18n/config";
import { slMessages } from "@/lib/i18n/messages";

export type TranslationParams = Record<string, string | number>;

export function translate(
  locale: Locale,
  source: string,
  params: TranslationParams = {},
) {
  let template = locale === "sl" ? (slMessages[source] ?? source) : source;
  if (locale === "sl" && template === source) {
    const duplicate =
      /^This ingredient duplicates row (\d+)\. Combine the quantities or use a section note\.$/.exec(
        source,
      );
    if (duplicate) {
      template = `Ta sestavina podvaja vrstico ${duplicate[1]}. Združite količine ali uporabite opombo razdelka.`;
    }
  }
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}

export function formatDate(
  locale: Locale,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) {
  return new Intl.DateTimeFormat(localeTag(locale), options).format(
    value instanceof Date ? value : new Date(value),
  );
}

export function formatNumber(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(localeTag(locale), options).format(value);
}

export function formatList(locale: Locale, values: string[]) {
  return new Intl.ListFormat(localeTag(locale), {
    style: "long",
    type: "conjunction",
  }).format(values);
}

export function plural(
  locale: Locale,
  count: number,
  forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string },
) {
  const category = new Intl.PluralRules(localeTag(locale)).select(count);
  return translate(locale, forms[category] ?? forms.other, { count });
}
