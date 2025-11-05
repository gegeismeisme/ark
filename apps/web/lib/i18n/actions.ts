"use server";

import { cookies } from "next/headers";

import { Locale, resolveLocale } from "./index";

const COOKIE_NAME = "locale";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function setLocale(nextLocale: string): Promise<Locale> {
  const locale = resolveLocale(nextLocale);
  const cookieStore = await cookies();

  cookieStore.set({
    name: COOKIE_NAME,
    value: locale,
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
  });

  return locale;
}
