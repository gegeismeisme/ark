'use client';

import { useCallback, useMemo, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  GroupMember,
  TaskAttachment,
  TaskAttachmentRow,
  TaskAssignmentDetail,
  TaskAssignmentDetailRow,
} from '../../types';

type UseTaskDetailArgs = {
  supabase: SupabaseClient;
  fetchImpl: typeof fetch;
  promptImpl: (message: string, defaultValue?: string) => string | null;
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
    refresh: (taskId?: string) => Promise<void>;
    upload: (file: File) => Promise<void>;
  };
};

export function useTaskDetailState({
  supabase,
  fetchImpl,
  promptImpl,
  userId,
  groupMembers,
  refreshTasks,
}: UseTaskDetailArgs): UseTaskDetailResult {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);

  const [records, setRecords] = useState<TaskAssignmentDetail[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);

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
        setAttachments([]);
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
      setAttachmentsLoading(false);
    },
    [supabase]
  );

  const open = useCallback(
    async (nextTaskId: string, taskRequiresAttachment = false) => {
      setTaskId(nextTaskId);
      setRequireAttachment(taskRequiresAttachment);
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
        status === 'accepted' ? '可选：填写验收备注' : '请输入需调整的说明';
      const noteValue = promptImpl(notePrompt, '');
      const sanitizedNote = noteValue && noteValue.trim().length > 0 ? noteValue.trim() : null;

      if (status === 'changes_requested' && !sanitizedNote) {
        setRecordsError('请输入需调整的说明后再提交。');
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
    [fetchAssignmentDetails, promptImpl, refreshTasks, supabase, taskId, userId]
  );

  const upload = useCallback(
    async (file: File) => {
      if (!taskId) return;
      setAttachmentUploading(true);
      setAttachmentError(null);

      try {
        const signResponse = await fetchImpl('/api/storage/sign-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId,
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });

        if (!signResponse.ok) {
          const body = await signResponse.json().catch(() => ({}));
          throw new Error(body.error ?? '签名生成失败，请稍后再试。');
        }

        const { url, path } = (await signResponse.json()) as { url: string; path: string };

        const uploadResponse = await fetchImpl(url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error('上传到存储失败，请稍后再试。');
        }

        const recordResponse = await fetchImpl(`/api/tasks/${taskId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            filePath: path,
            contentType: file.type || 'application/octet-stream',
            size: file.size,
          }),
        });

        if (!recordResponse.ok) {
          const recordBody = await recordResponse.json().catch(() => ({}));
          throw new Error(recordBody.error ?? '记录附件信息失败，请稍后再试。');
        }

        await fetchTaskAttachments(taskId);
      } catch (err) {
        setAttachmentError(err instanceof Error ? err.message : '附件上传失败，请稍后再试。');
      } finally {
        setAttachmentUploading(false);
      }
    },
    [fetchImpl, fetchTaskAttachments, taskId]
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
      refresh: async (targetTaskId?: string) => {
        if (!taskId && !targetTaskId) return;
        await fetchTaskAttachments(targetTaskId ?? taskId!);
      },
      upload,
    },
  };
}
