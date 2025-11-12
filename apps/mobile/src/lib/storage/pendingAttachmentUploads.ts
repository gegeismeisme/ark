'use client';

import {
  listCacheScopeIds,
  readCacheSnapshot,
  writeCacheSnapshot,
} from './localCache';

export type PendingAttachmentUpload = {
  id: string;
  taskId: string;
  fileUri: string;
  fileName: string;
  mimeType: string;
  size: number;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  lastAttemptAt: string | null;
};

type PendingAttachmentSnapshot = {
  taskId: string;
  uploads: PendingAttachmentUpload[];
  updatedAt: number;
};

export type PendingAttachmentSummary = {
  total: number;
  taskIds: string[];
  errorCount: number;
  lastError: string | null;
};

type SummaryListener = (summary: PendingAttachmentSummary) => void;
const summaryListeners = new Set<SummaryListener>();

const buildSnapshot = (
  taskId: string,
  uploads: PendingAttachmentUpload[],
): PendingAttachmentSnapshot => ({
  taskId,
  uploads,
  updatedAt: Date.now(),
});

export async function listPendingAttachmentUploads(
  taskId: string,
): Promise<PendingAttachmentUpload[]> {
  const snapshot = await readCacheSnapshot<PendingAttachmentSnapshot>(
    'taskAttachmentDrafts',
    taskId,
  );
  return snapshot?.uploads ?? [];
}

async function writePendingAttachmentUploads(
  taskId: string,
  uploads: PendingAttachmentUpload[],
) {
  await writeCacheSnapshot('taskAttachmentDrafts', buildSnapshot(taskId, uploads), taskId);
  void emitSummary();
}

const randomId = () => Math.random().toString(36).slice(2, 10);

export async function addPendingAttachmentUpload(
  taskId: string,
  upload: Omit<PendingAttachmentUpload, 'id' | 'attempts' | 'lastError' | 'createdAt' | 'lastAttemptAt'>,
): Promise<PendingAttachmentUpload> {
  const current = await listPendingAttachmentUploads(taskId);
  const record: PendingAttachmentUpload = {
    ...upload,
    id: `pending-${Date.now().toString(36)}-${randomId()}`,
    attempts: 0,
    lastError: null,
    createdAt: new Date().toISOString(),
    lastAttemptAt: null,
  };
  const uploads = [record, ...current];
  await writePendingAttachmentUploads(taskId, uploads);
  return record;
}

export async function updatePendingAttachmentUpload(
  taskId: string,
  uploadId: string,
  updater: (upload: PendingAttachmentUpload) => PendingAttachmentUpload,
): Promise<PendingAttachmentUpload | null> {
  const current = await listPendingAttachmentUploads(taskId);
  const next: PendingAttachmentUpload[] = [];
  let updated: PendingAttachmentUpload | null = null;
  current.forEach((upload) => {
    if (upload.id === uploadId) {
      const nextUpload = updater(upload);
      updated = nextUpload;
      next.push(nextUpload);
    } else {
      next.push(upload);
    }
  });
  await writePendingAttachmentUploads(taskId, next);
  return updated;
}

export async function removePendingAttachmentUpload(
  taskId: string,
  uploadId: string,
): Promise<void> {
  const current = await listPendingAttachmentUploads(taskId);
  const next = current.filter((upload) => upload.id !== uploadId);
  await writePendingAttachmentUploads(taskId, next);
}

const buildEmptySummary = (): PendingAttachmentSummary => ({
  total: 0,
  taskIds: [],
  errorCount: 0,
  lastError: null,
});

export async function getPendingAttachmentSummary(): Promise<PendingAttachmentSummary> {
  const scopeIds = await listCacheScopeIds('taskAttachmentDrafts');
  if (!scopeIds.length) {
    return buildEmptySummary();
  }

  const entries = await Promise.all(
    scopeIds.map(async (taskId) => ({
      taskId,
      uploads: await listPendingAttachmentUploads(taskId),
    })),
  );

  const summary = buildEmptySummary();
  let latestErrorMessage: string | null = null;
  let latestErrorTimestamp = 0;

  entries.forEach(({ taskId, uploads }) => {
    if (!uploads.length) {
      return;
    }
    summary.taskIds.push(taskId);
    summary.total += uploads.length;
    uploads.forEach((upload) => {
      if (upload.lastError) {
        summary.errorCount += 1;
        const tsCandidate = upload.lastAttemptAt
          ? Date.parse(upload.lastAttemptAt)
          : Date.parse(upload.createdAt);
        const timestamp = Number.isFinite(tsCandidate) ? tsCandidate : Date.now();
        if (!latestErrorMessage || timestamp > latestErrorTimestamp) {
          latestErrorMessage = upload.lastError;
          latestErrorTimestamp = timestamp;
        }
      }
    });
  });

  summary.lastError = latestErrorMessage;
  return summary;
}

async function emitSummary() {
  const payload = await getPendingAttachmentSummary();
  summaryListeners.forEach((listener) => {
    listener(payload);
  });
}

export function subscribePendingAttachmentSummary(listener: SummaryListener) {
  summaryListeners.add(listener);
  return () => summaryListeners.delete(listener);
}
