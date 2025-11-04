import en from './en.json';
import zh from './zh.json';

export type Locale = 'en' | 'zh';

type TranslationMap = Record<string, string>;

const translations: Record<Locale, TranslationMap> = {
  en,
  zh,
};

let currentLocale: Locale = 'en';

export const setLocale = (locale: Locale) => {
  if (translations[locale]) {
    currentLocale = locale;
  }
};

export const getLocale = (): Locale => currentLocale;

export type TranslationKey = keyof typeof en & string;

export const t = (key: TranslationKey | string, replacements?: Record<string, string | number>): string => {
  const template = translations[currentLocale][key] ?? translations.en[key] ?? key;
  if (!replacements) {
    return template;
  }
  return Object.entries(replacements).reduce((acc, [placeholder, value]) => {
    return acc.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value));
  }, template);
};
