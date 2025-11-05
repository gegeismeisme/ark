"use client";

import { ReactNode, useMemo } from "react";

import { I18nProvider } from "@/lib/i18n/client";
import { Locale, createTranslator } from "@/lib/i18n";

type WebI18nProviderProps = {
  locale: Locale;
  children: ReactNode;
};

export function WebI18nProvider({ locale, children }: WebI18nProviderProps) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale]);
  return <I18nProvider value={value}>{children}</I18nProvider>;
}
