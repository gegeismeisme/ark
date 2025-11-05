import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, Locale, normalizeLocale, resolveLocale } from "./index";

const parseAcceptLanguage = (headerValue: string | null): Locale | null => {
  if (!headerValue) return null;

  const segments = headerValue.split(",");
  for (const segment of segments) {
    const [language] = segment.trim().split(";");
    const normalized = normalizeLocale(language);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

export const getRequestLocale = async (): Promise<Locale> => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = normalizeLocale(cookieStore.get("locale")?.value);
  if (cookieLocale) return cookieLocale;

  const headerLocale = parseAcceptLanguage(headerStore.get("accept-language"));
  if (headerLocale) return headerLocale;

  return DEFAULT_LOCALE;
};

export const ensureLocale = (value?: string | null): Locale => resolveLocale(value);

