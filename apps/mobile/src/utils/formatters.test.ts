import { beforeEach, describe, expect, it } from 'vitest';

import { setLocale } from '../i18n';
import { formatDateTime } from './formatters';

describe('formatDateTime', () => {
  beforeEach(() => {
    setLocale('en');
  });

  it('returns placeholder when value is null', () => {
    expect(formatDateTime(null)).toBe('Not set');
  });

  it('returns fallback when parsing fails', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date');
  });

  it('returns formatted string for valid ISO input', () => {
    const iso = '2023-01-02T03:04:05.000Z';
    const result = formatDateTime(iso);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
