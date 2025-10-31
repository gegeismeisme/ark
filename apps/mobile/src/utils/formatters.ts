export function formatDateTime(value: string | null): string {
  if (!value) return '未设置';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}
