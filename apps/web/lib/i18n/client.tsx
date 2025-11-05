"use client";

import { createContext, useContext } from "react";

import { DEFAULT_LOCALE, Locale, Translator, createTranslator } from "./index";

export type I18nContextValue = {
  locale: Locale;
  t: Translator;
};

const I18NContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  t: createTranslator(DEFAULT_LOCALE),
});

export const I18nProvider = I18NContext.Provider;

export const useI18n = (): I18nContextValue => {
  const value = useContext(I18NContext);
  if (!value) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return value;
};

export const useTranslations = (): Translator => useI18n().t;

export const useLocale = (): Locale => useI18n().locale;
