'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';

import type { TaskAttachment } from '../../../types';
import { useAttachmentActions } from '../useAttachmentActions';

export type AttachmentState = {
  attachments: TaskAttachment[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  uploading: boolean;
  downloadingId: string | null;
};

const EMPTY_STATE: AttachmentState = {
  attachments: [],
  loading: false,
  loaded: false,
  error: null,
  uploading: false,
  downloadingId: null,
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

  const ensureLoaded = useCallback(
    async (taskId: string) => {
      const current = getState(taskId);
      if (current.loaded && !current.error) {
        return current.attachments;
      }

      updateState(taskId, (state) => ({
        ...state,
        loading: true,
        error: null,
      }));

      try {
        const items = await listAttachments(taskId);
        updateState(taskId, () => ({
          attachments: items,
          loading: false,
          loaded: true,
          error: null,
          uploading: false,
          downloadingId: null,
        }));
        return items;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件加载失败，请稍后再试。';
        updateState(taskId, (state) => ({
          ...state,
          loading: false,
          loaded: true,
          error: message,
        }));
        throw err;
      }
    },
    [getState, listAttachments, updateState],
  );

  const refresh = useCallback(
    async (taskId: string) => {
      updateState(taskId, (state) => ({
        ...state,
        loading: true,
        error: null,
      }));

      try {
        const items = await listAttachments(taskId);
        updateState(taskId, (state) => ({
          ...state,
          attachments: items,
          loading: false,
          loaded: true,
          error: null,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件加载失败，请稍后再试。';
        updateState(taskId, (state) => ({
          ...state,
          loading: false,
          loaded: true,
          error: message,
        }));
      }
    },
    [listAttachments, updateState],
  );

  const upload = useCallback(
    async (taskId: string): Promise<void> => {
      updateState(taskId, (state) => ({
        ...state,
        uploading: true,
        error: null,
      }));

      try {
        const picked = await pickAttachment();
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
        const message =
          err instanceof Error ? err.message : '附件上传失败，请稍后再试。';
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
          throw new Error('当前设备无法打开该附件链接。');
        }
        await Linking.openURL(url);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件打开失败，请稍后再试。';
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

  const maxAttachmentSizeLabel = useMemo(
    () => formatMaxSize(maxAttachmentSize),
    [maxAttachmentSize],
  );

  const hasOwnAttachment = useCallback(
    (taskId: string | null | undefined) => {
      if (!taskId) return false;
      const state = getState(taskId);
      if (!currentUserId) {
        return state.attachments.length > 0;
      }
      return state.attachments.some((item) => item.uploadedBy === currentUserId);
    },
    [currentUserId, getState],
  );

  return {
    getState,
    ensureLoaded,
    refresh,
    upload,
    download,
    maxAttachmentSizeLabel,
    hasOwnAttachment,
  };
}
