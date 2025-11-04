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

const ATTACHMENT_PATH_REGEX = /^org\/([^/]+)\/task\/([^/]+)\/(.+)$/;

export type ParsedAttachmentPath = {
  organizationId: string;
  taskId: string;
  fileName: string;
  path: string;
};

export function parseAttachmentPath(path: string | null | undefined): ParsedAttachmentPath | null {
  if (!path || typeof path !== 'string') return null;
  const normalized = path.replace(/^\/+/, '').trim();
  if (!normalized) return null;
  const match = ATTACHMENT_PATH_REGEX.exec(normalized);
  if (!match) return null;
  const [, organizationId, taskId, fileName] = match;
  if (!organizationId || !taskId || !fileName || fileName.includes('..')) {
    return null;
  }
  return {
    organizationId,
    taskId,
    fileName,
    path: normalized,
  };
}
