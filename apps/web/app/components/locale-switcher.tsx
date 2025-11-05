"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { AVAILABLE_LOCALES, Locale } from "@/lib/i18n";
import { setLocale } from "@/lib/i18n/actions";
import { useLocale, useTranslations } from "@/lib/i18n/client";

const BUTTON_BASE =
  "inline-flex items-center gap-2 rounded-full border border-[var(--ark-border-subtle)] bg-[var(--ark-card-surface)]/90 px-3 py-1.5 text-xs font-semibold text-[var(--ark-text-secondary)] shadow-[0_10px_28px_-22px_rgba(15,23,42,0.6)] transition hover:border-[var(--ark-accent)] hover:text-[var(--ark-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ark-accent)]/35 disabled:cursor-not-allowed disabled:opacity-60";

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
      <span aria-hidden="true" className="text-base leading-none">
        🌐
      </span>
      <span className="font-semibold uppercase">{locale}</span>
    </button>
  );
}
