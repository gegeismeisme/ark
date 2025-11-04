import { describe, expect, it } from 'vitest';

import { formatDateTime } from './formatters';

describe('formatDateTime', () => {
  it('returns placeholder when value is null', () => {
    expect(formatDateTime(null)).toBe('未设置');
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
