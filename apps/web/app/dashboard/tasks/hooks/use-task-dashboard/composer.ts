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
        setAttachmentError('错误1');
        return;
      }
      if (!isAllowedContentType(file.type)) {
        setAttachmentError('错误2');
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
            throw new Error(body.error ?? '错误3');
          }

          const { url, path } = (await signResponse.json()) as { url: string; path: string };

          const uploadResponse = await fetchImpl(url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error('错误4');
          }

          const recordResponse = await fetchImpl(`/api/tasks/${taskId}/attachments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            throw new Error(recordBody.error ?? '错误5');
          }
        }

        setPendingAttachments([]);
        setAttachmentError(null);

        if (onAttachmentRecorded) {
          await onAttachmentRecorded(taskId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '错误6';
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
      setError('错误7');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('错误8');
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
        const message = err instanceof Error ? err.message : '错误3';
        setError(message);
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
    pendingAttachments, // <-- 直接依赖数组本身
    selectedAssignees,
    selectedGroupId,
    setSelectedAssignees,
    supabase,
    title,
    uploadAttachmentsForTask,
    userId,
    onTaskCreated,
    requireAttachment, // <-- 把缺失的依赖加进来
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
