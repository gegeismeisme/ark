'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  GroupMember,
  TaskAttachment,
  TaskAttachmentRow,
  TaskAssignmentDetail,
  TaskAssignmentDetailRow,
} from '../../types';
import { useTranslations } from '@/lib/i18n/client';
import { readCacheSnapshot, writeCacheSnapshot } from '@/lib/cache/local-db';

type PendingUpload = {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  size: number;
  data: ArrayBuffer;
  createdAt: string;
  error: string | null;
};

const generatePendingId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1000)}`;

type UseTaskDetailArgs = {
  supabase: SupabaseClient;
  fetchImpl: typeof fetch;
  promptImpl: (message: string, defaultValue?: string) => string | null;
  orgId: string | null;
  userId: string | null;
  groupMembers: GroupMember[];
  refreshTasks: () => Promise<void>;
};

type UseTaskDetailResult = {
  taskId: string | null;
  requireAttachment: boolean;
  records: TaskAssignmentDetail[];
  loading: boolean;
  error: string | null;
  open: (taskId: string, requireAttachment?: boolean) => Promise<void>;
  close: () => void;
  review: (assignmentId: string, status: 'accepted' | 'changes_requested') => Promise<void>;
  attachments: {
    list: TaskAttachment[];
    loading: boolean;
    uploading: boolean;
    error: string | null;
    removingIds: string[];
    refresh: (taskId?: string) => Promise<void>;
    upload: (file: File) => Promise<void>;
    remove: (attachmentId: string) => Promise<void>;
    requestDownloadUrl: (path: string) => Promise<string>;
    pending: Array<{
      id: string;
      fileName: string;
      size: number;
      createdAt: string;
      error: string | null;
    }>;
    retryPending: (pendingId: string) => Promise<void>;
    discardPending: (pendingId: string) => void;
  };
};

export function useTaskDetailState({
  supabase,
  fetchImpl,
  promptImpl,
  orgId,
  userId,
  groupMembers,
  refreshTasks,
}: UseTaskDetailArgs): UseTaskDetailResult {
  const t = useTranslations();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);

  const [records, setRecords] = useState<TaskAssignmentDetail[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentRemoving, setAttachmentRemoving] = useState<Set<string>>(new Set());
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);

  const toggleAttachmentRemoving = useCallback((attachmentId: string, removing: boolean) => {
    setAttachmentRemoving((prev) => {
      const next = new Set(prev);
      if (removing) {
        next.add(attachmentId);
      } else {
        next.delete(attachmentId);
      }
      return next;
    });
  }, []);
  const persistAttachmentSnapshot = useCallback(
    async (taskIdValue: string, list: TaskAttachment[]) => {
      if (!orgId) return;
      const existing =
        (await readCacheSnapshot<Record<string, TaskAttachment[]>>('taskAttachments', orgId)) ?? {};
      existing[taskIdValue] = list;
      await writeCacheSnapshot('taskAttachments', existing, orgId);
    },
    [orgId]
  );

  const loadCachedAttachments = useCallback(
    async (taskIdValue: string) => {
      if (!orgId) return null;
      const cached =
        (await readCacheSnapshot<Record<string, TaskAttachment[]>>('taskAttachments', orgId)) ?? {};
      return cached[taskIdValue] ?? null;
    },
    [orgId]
  );

  const persistPendingUploads = useCallback(
    async (taskIdValue: string, uploads: PendingUpload[]) => {
      if (!orgId) return;
      const existing =
        (await readCacheSnapshot<Record<string, PendingUpload[]>>('taskAttachmentDrafts', orgId)) ??
        {};
      if (uploads.length > 0) {
        existing[taskIdValue] = uploads;
      } else {
        delete existing[taskIdValue];
      }
      await writeCacheSnapshot('taskAttachmentDrafts', existing, orgId);
    },
    [orgId]
  );

  const loadPendingUploads = useCallback(
    async (taskIdValue: string) => {
      if (!orgId) return [];
      const cached =
        (await readCacheSnapshot<Record<string, PendingUpload[]>>('taskAttachmentDrafts', orgId)) ??
        {};
      return cached[taskIdValue] ?? [];
    },
    [orgId]
  );

  useEffect(() => {
    if (!taskId) {
      setPendingUploads([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const [cachedAttachments, cachedPending] = await Promise.all([
        loadCachedAttachments(taskId),
        loadPendingUploads(taskId),
      ]);
      if (cancelled) return;
      if (cachedAttachments) {
        setAttachments(cachedAttachments);
      }
      setPendingUploads(cachedPending);
    })();

    return () => {
      cancelled = true;
    };
  }, [loadCachedAttachments, loadPendingUploads, taskId]);

  const queuePendingUpload = useCallback(
    async (file: File, errorMessage: string | null) => {
      if (!taskId) return;
      const buffer = await file.arrayBuffer();
      const pending: PendingUpload = {
        id: generatePendingId(),
        taskId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        data: buffer,
        createdAt: new Date().toISOString(),
        error: errorMessage,
      };
      setPendingUploads((prev) => {
        const next = [...prev, pending];
        void persistPendingUploads(taskId, next);
        return next;
      });
    },
    [persistPendingUploads, taskId]
  );

  const removePendingUpload = useCallback(
    (pendingId: string) => {
      if (!taskId) return;
      setPendingUploads((prev) => {
        const next = prev.filter((item) => item.id !== pendingId);
        void persistPendingUploads(taskId, next);
        return next;
      });
    },
    [persistPendingUploads, taskId]
  );

  const updatePendingError = useCallback(
    (pendingId: string, message: string) => {
      if (!taskId) return;
      setPendingUploads((prev) => {
        const next = prev.map((item) =>
          item.id === pendingId ? { ...item, error: message } : item
        );
        void persistPendingUploads(taskId, next);
        return next;
      });
    },
    [persistPendingUploads, taskId]
  );

  const memberNameMap = useMemo(() => {
    const map = new Map<string, string | null>();
    groupMembers.forEach((member) => {
      map.set(member.userId, member.fullName ?? null);
    });
    return map;
  }, [groupMembers]);

  const fetchAssignmentDetails = useCallback(
    async (targetTaskId: string) => {
      setRecordsLoading(true);
      setRecordsError(null);

      const { data, error } = await supabase
        .from('task_assignments')
        .select(
          'id, assignee_id, status, completion_note, review_status, review_note, reviewed_at, created_at'
        )
        .eq('task_id', targetTaskId)
        .order('created_at', { ascending: true });

      if (error) {
        setRecords([]);
        setRecordsError(error.message);
        setRecordsLoading(false);
        return;
      }

      const mapped =
        (data ?? []).map((row: TaskAssignmentDetailRow) => ({
          id: row.id,
          assigneeId: row.assignee_id,
          assigneeName: memberNameMap.get(row.assignee_id) ?? null,
          status: row.status,
          completionNote: row.completion_note,
          reviewStatus: row.review_status,
          reviewNote: row.review_note,
          reviewedAt: row.reviewed_at,
        })) ?? [];

      setRecords(mapped);
      setRecordsLoading(false);
    },
    [memberNameMap, supabase]
  );

  const fetchTaskAttachments = useCallback(
    async (targetTaskId: string) => {
      setAttachmentsLoading(true);
      setAttachmentError(null);

      const { data, error } = await supabase
        .from('task_attachments')
        .select(
          'id, task_id, organization_id, uploaded_by, file_name, file_path, content_type, size_bytes, uploaded_at'
        )
        .eq('task_id', targetTaskId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        const cached = await loadCachedAttachments(targetTaskId);
        if (cached) {
          setAttachments(cached);
        } else {
          setAttachments([]);
        }
        setAttachmentError(error.message);
        setAttachmentsLoading(false);
        return;
      }

      const mapped =
        (data ?? []).map((row: TaskAttachmentRow) => ({
          id: row.id,
          taskId: row.task_id,
          organizationId: row.organization_id,
          uploadedBy: row.uploaded_by,
          fileName: row.file_name,
          filePath: row.file_path,
          contentType: row.content_type,
          sizeBytes: row.size_bytes,
          uploadedAt: row.uploaded_at,
        })) ?? [];

      setAttachments(mapped);
      await persistAttachmentSnapshot(targetTaskId, mapped);
      setAttachmentsLoading(false);
    },
    [loadCachedAttachments, persistAttachmentSnapshot, supabase]
  );

  const open = useCallback(
    async (nextTaskId: string, nextRequireAttachment = false) => {
      setTaskId(nextTaskId);
      setRequireAttachment(nextRequireAttachment);
      await Promise.all([fetchAssignmentDetails(nextTaskId), fetchTaskAttachments(nextTaskId)]);
    },
    [fetchAssignmentDetails, fetchTaskAttachments]
  );

  const close = useCallback(() => {
    setTaskId(null);
    setRequireAttachment(false);
    setRecords([]);
    setRecordsError(null);
    setAttachments([]);
    setAttachmentError(null);
  }, []);

  const review = useCallback(
    async (assignmentId: string, status: 'accepted' | 'changes_requested') => {
      if (!taskId || !userId) return;
      const notePrompt =
        status === 'accepted'
          ? t('dashboard.tasks.detail.review.promptAccept')
          : t('dashboard.tasks.detail.review.promptChanges');
      const noteValue = promptImpl(notePrompt, '');
      const sanitizedNote = noteValue && noteValue.trim().length > 0 ? noteValue.trim() : null;

      if (status === 'changes_requested' && !sanitizedNote) {
        setRecordsError(t('dashboard.tasks.detail.review.changesNoteRequired'));
        return;
      }

      const { error } = await supabase
        .from('task_assignments')
        .update({
          review_status: status,
          review_note: sanitizedNote,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq('id', assignmentId);

      if (error) {
        setRecordsError(error.message);
        return;
      }

      await Promise.all([
        fetchAssignmentDetails(taskId),
        refreshTasks().catch((err) => {
          console.error('[tasks] refresh after review failed:', err);
        }),
      ]);
    },
    [fetchAssignmentDetails, promptImpl, refreshTasks, supabase, taskId, t, userId]
  );

  const uploadAttachment = useCallback(
    async (file: File, options?: { pendingId?: string }) => {
      if (!taskId) return;
      setAttachmentUploading(true);
      setAttachmentError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token ?? null;
        if (!accessToken) {
          throw new Error(t('dashboard.tasks.detail.errors.sessionMissing'));
        }

        const signResponse = await fetchImpl('/api/storage/sign-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            taskId,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });

        if (!signResponse.ok) {
          const body = await signResponse.json().catch(() => ({}));
          throw new Error(body.error ?? t('dashboard.tasks.detail.errors.signatureFailed'));
        }

        const { url, path } = (await signResponse.json()) as { url: string; path: string };

        const uploadResponse = await fetchImpl(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(t('dashboard.tasks.detail.errors.storageFailed'));
        }

        const recordResponse = await fetchImpl(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({
            fileName: file.name,
            filePath: path,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });

        if (!recordResponse.ok) {
          const recordBody = await recordResponse.json().catch(() => ({}));
          throw new Error(recordBody.error ?? t('dashboard.tasks.detail.errors.recordFailed'));
        }

        if (options?.pendingId) {
          removePendingUpload(options.pendingId);
        }

        await fetchTaskAttachments(taskId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('dashboard.tasks.detail.errors.uploadFailed');
        setAttachmentError(message);
        if (options?.pendingId) {
          updatePendingError(options.pendingId, message);
        } else {
          await queuePendingUpload(file, message);
        }
      } finally {
        setAttachmentUploading(false);
      }
    },
    [
      fetchImpl,
      fetchTaskAttachments,
      queuePendingUpload,
      removePendingUpload,
      supabase,
      t,
      taskId,
      updatePendingError,
    ]
  );

  const retryPendingUpload = useCallback(
    async (pendingId: string) => {
      const pending = pendingUploads.find((item) => item.id === pendingId);
      if (!pending) return;
      const mime = pending.mimeType || 'application/octet-stream';
      const blob = new Blob([pending.data], { type: mime });
      const file = new File([blob], pending.fileName, { type: mime });
      await uploadAttachment(file, { pendingId });
    },
    [pendingUploads, uploadAttachment]
  );

  const discardPendingUpload = useCallback(
    (pendingId: string) => {
      removePendingUpload(pendingId);
    },
    [removePendingUpload]
  );
  const remove = useCallback(
    async (attachmentId: string) => {
      if (!taskId) return;
      toggleAttachmentRemoving(attachmentId, true);
      setAttachmentError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token ?? null;
        if (!accessToken) {
          throw new Error(t('dashboard.tasks.detail.errors.sessionMissing'));
        }

        const response = await fetchImpl(`/api/tasks/${taskId}/attachments/${attachmentId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          credentials: 'include',
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(
            body.error ?? t('dashboard.tasks.detail.errors.deleteFailed')
          );
        }

        await fetchTaskAttachments(taskId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t('dashboard.tasks.detail.errors.deleteFailed');
        setAttachmentError(message);
      } finally {
        toggleAttachmentRemoving(attachmentId, false);
      }
    },
    [fetchImpl, fetchTaskAttachments, supabase, t, taskId, toggleAttachmentRemoving]
  );

  const requestDownloadUrl = useCallback(
    async (path: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;
      if (!accessToken) {
        throw new Error(t('dashboard.tasks.detail.errors.sessionMissing'));
      }

      const response = await fetchImpl('/api/storage/sign-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ path }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ?? t('dashboard.tasks.detail.errors.downloadLinkFailed')
        );
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error(t('dashboard.tasks.detail.errors.downloadExpired'));
      }

      return data.url;
    },
    [fetchImpl, supabase, t]
  );

  return {
    taskId,
    requireAttachment,
    records,
    loading: recordsLoading,
    error: recordsError,
    open,
    close,
    review,
    attachments: {
      list: attachments,
      loading: attachmentsLoading,
      uploading: attachmentUploading,
      error: attachmentError,
      removingIds: Array.from(attachmentRemoving),
      refresh: async (targetTaskId?: string) => {
        if (!taskId && !targetTaskId) return;
        await fetchTaskAttachments(targetTaskId ?? taskId!);
      },
      upload: (file: File) => uploadAttachment(file),
      remove,
      requestDownloadUrl,
      pending: pendingUploads.map((item) => ({
        id: item.id,
        fileName: item.fileName,
        size: item.size,
        createdAt: item.createdAt,
        error: item.error,
      })),
      retryPending: retryPendingUpload,
      discardPending: discardPendingUpload,
    },
  };
}
