'use client';

import { readCacheSnapshot, writeCacheSnapshot } from './localCache';

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
