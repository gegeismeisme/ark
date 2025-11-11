'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';

import { t } from '../../../i18n';
import type { TaskAttachment } from '../../../types';
import { useAttachmentActions, type AttachmentSource } from '../useAttachmentActions';
import {
  readCachedAttachments,
  writeCachedAttachments,
} from '../../../lib/storage/offlineAttachments';
import {
  addPendingAttachmentUpload,
  listPendingAttachmentUploads,
  removePendingAttachmentUpload,
  updatePendingAttachmentUpload,
  type PendingAttachmentUpload,
} from '../../../lib/storage/pendingAttachmentUploads';

export type AttachmentState = {
  attachments: TaskAttachment[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  uploading: boolean;
  downloadingId: string | null;
  pendingUploads: PendingAttachmentUpload[];
  retryingId: string | null;
};

const EMPTY_STATE: AttachmentState = {
  attachments: [],
  loading: false,
  loaded: false,
  error: null,
  uploading: false,
  downloadingId: null,
  pendingUploads: [],
  retryingId: null,
};

const BYTES_IN_KB = 1024;
const BYTES_IN_MB = BYTES_IN_KB * 1024;

const formatMaxSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '20 MB';
  }

  if (bytes >= BYTES_IN_MB) {
    const value = bytes / BYTES_IN_MB;
    return value >= 10 ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
  }

  const value = bytes / BYTES_IN_KB;
  return value >= 10 ? `${Math.round(value)} KB` : `${value.toFixed(1)} KB`;
};

type UseTaskAttachmentsOptions = {
  currentUserId: string | null;
  fetchImpl?: typeof fetch;
};

const NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'failed to fetch',
  'networkerror',
  'offline',
  'network unavailable',
];

const isRetriableError = (error: unknown): error is Error => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return NETWORK_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
};

export function useTaskAttachments({
  currentUserId,
  fetchImpl,
}: UseTaskAttachmentsOptions) {
  const {
    pickAttachment,
    listAttachments,
    uploadAttachment,
    requestDownloadUrl,
    maxAttachmentSize,
  } = useAttachmentActions(fetchImpl);

  const [attachmentMap, setAttachmentMap] = useState<Record<string, AttachmentState>>({});
  const stateRef = useRef(attachmentMap);

  const updateState = useCallback(
    (taskId: string, updater: (state: AttachmentState) => AttachmentState) => {
      setAttachmentMap((prev) => {
        const current = prev[taskId] ?? EMPTY_STATE;
        const next = updater(current);
        const map = { ...prev, [taskId]: next };
        stateRef.current = map;
        return map;
      });
    },
    [],
  );

  const getState = useCallback(
    (taskId: string | null | undefined): AttachmentState =>
      taskId ? stateRef.current[taskId] ?? EMPTY_STATE : EMPTY_STATE,
    [],
  );

  const syncPendingUploads = useCallback(async (taskId: string) => {
    const pending = await listPendingAttachmentUploads(taskId);
    updateState(taskId, (state) => ({
      ...state,
      pendingUploads: pending,
    }));
    return pending;
  }, [updateState]);

  const ensureLoaded = useCallback(
    async (taskId: string) => {
      const current = getState(taskId);
      if (current.loaded && !current.error) {
        await syncPendingUploads(taskId);
        return current.attachments;
      }

      updateState(taskId, (state) => ({
        ...state,
        loading: true,
        error: null,
      }));

      void syncPendingUploads(taskId).catch(() => undefined);

      try {
        const items = await listAttachments(taskId);
        updateState(taskId, (state) => ({
          ...state,
          attachments: items,
          loading: false,
          loaded: true,
          error: null,
          uploading: false,
          downloadingId: null,
        }));
        await writeCachedAttachments(taskId, items);
        return items;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('task.attachments.error.load');
        updateState(taskId, (state) => ({
          ...state,
          loading: false,
          loaded: true,
          error: message,
        }));
        const cached = await readCachedAttachments(taskId);
        if (cached) {
          updateState(taskId, (state) => ({
            ...state,
            attachments: cached,
            loaded: true,
          }));
          return cached;
        }
        throw err;
      }
    },
    [getState, listAttachments, syncPendingUploads, updateState],
  );

  const refresh = useCallback(
    async (taskId: string) => {
      updateState(taskId, (state) => ({
        ...state,
        loading: true,
        error: null,
      }));

      void syncPendingUploads(taskId).catch(() => undefined);

      try {
        const items = await listAttachments(taskId);
        updateState(taskId, (state) => ({
          ...state,
          attachments: items,
          loading: false,
          loaded: true,
          error: null,
        }));
        await writeCachedAttachments(taskId, items);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('task.attachments.error.load');
        updateState(taskId, (state) => ({
          ...state,
          loading: false,
          loaded: true,
          error: message,
        }));
      }
    },
    [listAttachments, syncPendingUploads, updateState],
  );

  const upload = useCallback(
    async (taskId: string, source: AttachmentSource = 'document'): Promise<void> => {
      updateState(taskId, (state) => ({
        ...state,
        uploading: true,
        error: null,
      }));

      let picked: Awaited<ReturnType<typeof pickAttachment>> = null;

      try {
        picked = await pickAttachment(source);
        if (!picked) {
          updateState(taskId, (state) => ({
            ...state,
            uploading: false,
          }));
          return;
        }

        const attachment = await uploadAttachment(taskId, picked);

        updateState(taskId, (state) => ({
          ...state,
          uploading: false,
          attachments: [attachment, ...state.attachments],
          loaded: true,
          error: null,
        }));
      } catch (err) {
        if (picked && isRetriableError(err)) {
          const pending = await addPendingAttachmentUpload(taskId, {
            taskId,
            fileUri: picked.uri,
            fileName: picked.name,
            mimeType: picked.mimeType || 'application/octet-stream',
            size: picked.size ?? 0,
          });
          updateState(taskId, (state) => ({
            ...state,
            uploading: false,
            pendingUploads: [pending, ...state.pendingUploads],
            error: t('task.attachments.pendingQueued'),
          }));
          return;
        }

        const message =
          err instanceof Error ? err.message : t('task.attachments.error.upload');
        updateState(taskId, (state) => ({
          ...state,
          uploading: false,
          error: message,
        }));
        throw err;
      }
    },
    [pickAttachment, updateState, uploadAttachment],
  );

  const download = useCallback(
    async (taskId: string, attachment: TaskAttachment): Promise<void> => {
      updateState(taskId, (state) => ({
        ...state,
        downloadingId: attachment.id,
        error: null,
      }));

      try {
        const url = await requestDownloadUrl(attachment.filePath);
        const supported = await Linking.canOpenURL(url);
        if (!supported) {
          throw new Error(t('task.attachments.error.open'));
        }
        await Linking.openURL(url);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('task.attachments.error.download');
        updateState(taskId, (state) => ({
          ...state,
          error: message,
        }));
        throw err;
      } finally {
        updateState(taskId, (state) => ({
          ...state,
          downloadingId: null,
        }));
      }
    },
    [requestDownloadUrl, updateState],
  );

  const retryPendingUpload = useCallback(
    async (taskId: string, pendingId: string): Promise<void> => {
      updateState(taskId, (state) => ({
        ...state,
        retryingId: pendingId,
        error: null,
      }));

      try {
        const pendingList = await listPendingAttachmentUploads(taskId);
        const target = pendingList.find((item) => item.id === pendingId);
        if (!target) {
          updateState(taskId, (state) => ({
            ...state,
            retryingId: null,
            pendingUploads: pendingList,
          }));
          return;
        }

        const attachment = await uploadAttachment(taskId, {
          uri: target.fileUri,
          name: target.fileName,
          mimeType: target.mimeType,
          size: target.size,
        });

        await removePendingAttachmentUpload(taskId, pendingId);
        updateState(taskId, (state) => ({
          ...state,
          retryingId: null,
          pendingUploads: state.pendingUploads.filter((upload) => upload.id !== pendingId),
          attachments: [attachment, ...state.attachments],
          error: null,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('task.attachments.error.upload');
        await updatePendingAttachmentUpload(taskId, pendingId, (upload) => ({
          ...upload,
          attempts: upload.attempts + 1,
          lastError: message,
          lastAttemptAt: new Date().toISOString(),
        }));
        const pending = await listPendingAttachmentUploads(taskId);
        updateState(taskId, (state) => ({
          ...state,
          retryingId: null,
          pendingUploads: pending,
          error: message,
        }));
      }
    },
    [
      listPendingAttachmentUploads,
      removePendingAttachmentUpload,
      updatePendingAttachmentUpload,
      updateState,
      uploadAttachment,
    ],
  );

  const removePendingUpload = useCallback(
    async (taskId: string, pendingId: string) => {
      await removePendingAttachmentUpload(taskId, pendingId);
      const pending = await listPendingAttachmentUploads(taskId);
      updateState(taskId, (state) => ({
        ...state,
        pendingUploads: pending,
      }));
    },
    [listPendingAttachmentUploads, removePendingAttachmentUpload, updateState],
  );

  const maxAttachmentSizeLabel = useMemo(
    () => formatMaxSize(maxAttachmentSize),
    [maxAttachmentSize],
  );

  const hasOwnAttachment = useCallback(
    (taskId: string | null | undefined) => {
      if (!taskId) return false;
      const state = getState(taskId);
      const hasSynced =
        currentUserId && currentUserId.length > 0
          ? state.attachments.some((item) => item.uploadedBy === currentUserId)
          : state.attachments.length > 0;
      if (hasSynced) return true;
      return (state.pendingUploads?.length ?? 0) > 0;
    },
    [currentUserId, getState],
  );

  return {
    getState,
    ensureLoaded,
    refresh,
    upload,
    download,
    retryPendingUpload,
    removePendingUpload,
    maxAttachmentSizeLabel,
    hasOwnAttachment,
  };
}






