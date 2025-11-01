export const ATTACHMENTS_BUCKET =
  process.env.STORAGE_ATTACHMENTS_BUCKET && process.env.STORAGE_ATTACHMENTS_BUCKET.trim().length
    ? process.env.STORAGE_ATTACHMENTS_BUCKET.trim()
    : 'attachments';

const maxSizeEnv = process.env.STORAGE_MAX_ATTACHMENT_SIZE ?? '';
const parsedMaxSize = Number(maxSizeEnv);

export const ATTACHMENT_MAX_SIZE_BYTES =
  Number.isFinite(parsedMaxSize) && parsedMaxSize > 0 ? parsedMaxSize : 20 * 1024 * 1024; // 20MB

const explicitMimeTypes = (process.env.STORAGE_ALLOWED_MIME_TYPES ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const mimePrefixes = (process.env.STORAGE_ALLOWED_MIME_PREFIXES ?? 'image/')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const defaultMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
];

const allowedMimeTypes = new Set([...explicitMimeTypes, ...defaultMimeTypes]);

export function isAllowedContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  if (allowedMimeTypes.has(contentType)) return true;
  return mimePrefixes.some((prefix) => contentType.startsWith(prefix));
}
