"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { AVAILABLE_LOCALES, Locale } from "@/lib/i18n";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale, useTranslations } from "@/lib/i18n/client";

const BUTTON_BASE =
  "inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 shadow-sm transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function LocaleSwitcher() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();

  const currentIndex = AVAILABLE_LOCALES.indexOf(locale);
  const nextLocale: Locale = AVAILABLE_LOCALES[(currentIndex + 1) % AVAILABLE_LOCALES.length];

  const handleToggle = () => {
    startTransition(async () => {
      await setLocale(nextLocale);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={BUTTON_BASE}
      aria-label={t("locale.toggle", { locale: t(`locale.name.${nextLocale}`) })}
      disabled={pending}
    >
      <span aria-hidden="true" className="text-base">
        🌐
      </span>
      <span className="font-semibold uppercase">{locale}</span>
    </button>
  );
}
