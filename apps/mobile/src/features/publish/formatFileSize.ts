export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const value = bytes / 1024;
    return value >= 10 ? `${Math.round(value)} KB` : `${value.toFixed(1)} KB`;
  }
  const value = bytes / (1024 * 1024);
  return value >= 10 ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
};
