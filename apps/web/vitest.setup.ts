import React from 'react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import '@testing-library/jest-dom';

vi.mock('@/lib/i18n/client', () => {
  const t =
    () =>
    (key: string, vars?: Record<string, string | number>) => {
      if (!vars) return key;
      const serialized = Object.entries(vars)
        .map(([varKey, value]) => `${varKey}=${String(value)}`)
        .join(',');
      return `${key}:${serialized}`;
    };

  const locale = 'en';

  const value = {
    locale,
    t: t(),
  };

  const Provider = ({ children }: { children: ReactNode }) =>
    React.createElement(React.Fragment, null, children);

  return {
    I18nProvider: Provider,
    useI18n: () => value,
    useTranslations: () => value.t,
    useLocale: () => locale,
  };
});

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://example.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'service-role-key';
