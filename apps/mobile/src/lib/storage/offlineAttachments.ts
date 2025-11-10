'use client';

import type { TaskAttachment } from '../../types';
import { readCacheSnapshot, writeCacheSnapshot } from './localCache';

type AttachmentSnapshot = {
  taskId: string;
  attachments: TaskAttachment[];
  updatedAt: number;
};

export async function writeCachedAttachments(
  taskId: string,
  attachments: TaskAttachment[]
) {
  try {
    const payload: AttachmentSnapshot = {
      taskId,
      attachments,
      updatedAt: Date.now(),
    };
    await writeCacheSnapshot('taskAttachments', payload, taskId);
  } catch (error) {
    console.warn('[offlineAttachments] write failed', error);
  }
}

export async function readCachedAttachments(
  taskId: string
): Promise<TaskAttachment[] | null> {
  try {
    const snapshot = await readCacheSnapshot<AttachmentSnapshot>('taskAttachments', taskId);
    if (!snapshot) return null;
    return snapshot.attachments ?? null;
  } catch (error) {
    console.warn('[offlineAttachments] read failed', error);
    return null;
  }
}
