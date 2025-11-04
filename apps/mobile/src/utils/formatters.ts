import { t } from '../i18n';

export function formatDateTime(value: string | null): string {
  if (!value) return t('common.notSet');

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  } catch {
    return value;
  }
}
