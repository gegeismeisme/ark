'use client';

import { useCallback, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ATTACHMENT_MAX_SIZE_BYTES,
  isAllowedContentType,
} from '../../../../../lib/attachment-utils';
import type { AttachmentDraft } from '../../types';

type UseComposerArgs = {
  supabase: SupabaseClient;
  fetchImpl: typeof fetch;
  orgId: string | null;
  userId: string | null;
  selectedGroupId: string | null;
  selectedAssignees: string[];
  setSelectedAssignees: React.Dispatch<React.SetStateAction<string[]>>;
  onTaskCreated: (taskId: string, groupId: string) => Promise<void>;
  onAttachmentRecorded?: (taskId: string) => Promise<void>;
};

type UseComposerResult = {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  dueAt: string;
  setDueAt: (value: string) => void;
  creating: boolean;
  error: string | null;
  requireAttachment: boolean;
  setRequireAttachment: (value: boolean) => void;
  attachments: {
    pending: AttachmentDraft[];
    addFiles: (files: FileList | null) => void;
    removeFile: (id: string) => void;
    uploading: boolean;
    error: string | null;
  };
  createTask: () => Promise<void>;
};

function makeDraftId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useTaskComposerState({
  supabase,
  fetchImpl,
  orgId,
  userId,
  selectedGroupId,
  selectedAssignees,
  setSelectedAssignees,
  onTaskCreated,
  onAttachmentRecorded,
}: UseComposerArgs): UseComposerResult {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);

  const [pendingAttachments, setPendingAttachments] = useState<AttachmentDraft[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    setAttachmentError(null);
    const drafts: AttachmentDraft[] = [];
    Array.from(files).forEach((file) => {
      if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
        setAttachmentError('附件体积超出限制，请压缩后再上传。');
        return;
      }
      if (!isAllowedContentType(file.type)) {
        setAttachmentError('文件类型不被允许，请选择常见图片、文档或压缩包。');
        return;
      }
      drafts.push({
        id: makeDraftId(),
        file,
      });
    });

    if (drafts.length) {
      setPendingAttachments((prev) => [...prev, ...drafts]);
    }
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const uploadAttachmentsForTask = useCallback(
    async (taskId: string) => {
      if (pendingAttachments.length === 0) {
        setAttachmentError(null);
        return;
      }

      setUploadingAttachments(true);

      try {
        for (const draft of pendingAttachments) {
          const { file } = draft;

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
        }

        setPendingAttachments([]);
        setAttachmentError(null);

        if (onAttachmentRecorded) {
          await onAttachmentRecorded(taskId);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件上传失败，请稍后再试。';
        setAttachmentError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setUploadingAttachments(false);
      }
    },
    [fetchImpl, onAttachmentRecorded, pendingAttachments]
  );

  const createTask = useCallback(async () => {
    if (!orgId || !selectedGroupId || !userId) {
      setError('请先选择有效的组织和小组。');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('请输入任务标题。');
      return;
    }

    if (requireAttachment && pendingAttachments.length === 0) {
      setError('此任务要求上传附件，请添加至少一个附件。');
      return;
    }

    setCreating(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({
        organization_id: orgId,
        group_id: selectedGroupId,
        created_by: userId,
        title: trimmedTitle,
        description: description.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        require_attachment: requireAttachment,
      })
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      setCreating(false);
      return;
    }

    const taskId = (data as { id: string }).id;

    if (selectedAssignees.length > 0) {
      const assignments = selectedAssignees.map((assigneeId) => ({
        task_id: taskId,
        assignee_id: assigneeId,
        status: 'sent',
      }));
      const { error: assignmentError } = await supabase.from('task_assignments').insert(assignments);
      if (assignmentError) {
        setError(assignmentError.message);
        setCreating(false);
        return;
      }
    }

    if (pendingAttachments.length > 0) {
      try {
        await uploadAttachmentsForTask(taskId);
      } catch (err) {
        setCreating(false);
        setError(err instanceof Error ? err.message : '附件上传失败，请稍后再试。');
        return;
      }
    } else {
      setAttachmentError(null);
    }

    setTitle('');
    setDescription('');
    setDueAt('');
    setRequireAttachment(false);
    setSelectedAssignees([]);

    await onTaskCreated(taskId, selectedGroupId);
    setCreating(false);
  }, [
    description,
    dueAt,
    orgId,
    pendingAttachments.length,
    requireAttachment,
    selectedAssignees,
    selectedGroupId,
    setSelectedAssignees,
    supabase,
    title,
    uploadAttachmentsForTask,
    userId,
    onTaskCreated,
  ]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    dueAt,
    setDueAt,
    creating,
    error,
    requireAttachment,
    setRequireAttachment,
    attachments: {
      pending: pendingAttachments,
      addFiles,
      removeFile,
      uploading: uploadingAttachments,
      error: attachmentError,
    },
    createTask,
  };
}
