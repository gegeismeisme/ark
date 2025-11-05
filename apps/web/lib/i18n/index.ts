import en from "./en.json";
import zh from "./zh.json";

export type Locale = "en" | "zh";

export const AVAILABLE_LOCALES: Locale[] = ["en", "zh"];
export const DEFAULT_LOCALE: Locale = "en";

const dictionaries = {
  en,
  zh,
} as const;

type Dictionary = Record<string, string>;

export type TranslationKey = keyof typeof en & string;

export type Translator = (
  key: TranslationKey | string,
  replacements?: Record<string, string | number>
) => string;

const getDictionary = (locale: Locale): Dictionary => dictionaries[locale] as Dictionary;

const TEMPLATE_PLACEHOLDER = /{{\s*(\w+)\s*}}/g;

const formatTemplate = (
  template: string,
  replacements?: Record<string, string | number>
): string => {
  if (!replacements) return template;

  return template.replace(TEMPLATE_PLACEHOLDER, (_, placeholder) => {
    const value = replacements[placeholder];
    return value === undefined || value === null ? "" : String(value);
  });
};

export const createTranslator = (locale: Locale): Translator => {
  const active = getDictionary(locale);
  const fallback = getDictionary("en");

  return (key, replacements) => {
    const template = active[key] ?? fallback[key] ?? key;
    return formatTemplate(template, replacements);
  };
};

const LOCALE_PATTERN = /^([a-z]{2})(?:-|$)/i;

export const normalizeLocale = (value?: string | null): Locale | null => {
  if (!value) return null;
  const match = value.match(LOCALE_PATTERN);
  if (!match) return null;
  const code = match[1].toLowerCase();
  if (code === "zh") return "zh";
  if (code === "en") return "en";
  return null;
};

export const resolveLocale = (value?: string | null): Locale => {
  return normalizeLocale(value) ?? DEFAULT_LOCALE;
};

export const getDictionaryKeys = (): string[] => Object.keys(dictionaries.en);

export { formatTemplate };
