'use client';

import { useCallback, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ATTACHMENT_MAX_SIZE_BYTES,
  isAllowedContentType,
} from '@/lib/attachment-utils';
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
  isOpen: boolean;
  open: () => void;
  close: () => void;
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

function makeDraftId(): string {
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
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requireAttachment, setRequireAttachment] = useState(false);

  const [pendingAttachments, setPendingAttachments] = useState<AttachmentDraft[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setAttachmentError(null);
  }, []);

  const addFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    setAttachmentError(null);
    const drafts: AttachmentDraft[] = [];

    Array.from(files).forEach((file) => {
      if (file.size > ATTACHMENT_MAX_SIZE_BYTES) {
        setAttachmentError('\u6587\u4ef6\u8fc7\u5927\uff0c\u8bf7\u538b\u7f29\u540e\u518d\u4e0a\u4f20\u3002');
        return;
      }
      if (!isAllowedContentType(file.type)) {
        setAttachmentError('\u6587\u4ef6\u7c7b\u578b\u4e0d\u652f\u6301\uff0c\u8bf7\u9009\u62e9\u5e38\u89c1\u56fe\u7247\u3001\u6587\u6863\u6216\u538b\u7f29\u5305\u3002');
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
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token ?? null;
        if (!accessToken) {
          throw new Error('\u65e0\u6cd5\u83b7\u53d6\u767b\u5f55\u51ed\u8bc1\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55\u540e\u518d\u8bd5\u3002');
        }

        for (const draft of pendingAttachments) {
          const { file } = draft;
          const effectiveType = file.type || 'application/octet-stream';

          const signResponse = await fetchImpl('/api/storage/sign-upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              taskId,
              fileName: file.name,
              contentType: effectiveType,
              size: file.size,
            }),
          });

          const signPayload = await signResponse.json().catch(() => null);
          if (
            !signResponse.ok ||
            !signPayload ||
            typeof signPayload.url !== 'string' ||
            typeof signPayload.path !== 'string'
          ) {
            const message =
              (signPayload?.error as string | undefined) ?? '\u751f\u6210\u4e0a\u4f20\u7b7e\u540d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002';
            throw new Error(message);
          }

          const uploadResponse = await fetch(signPayload.url, {
            method: 'PUT',
            headers: {
              'Content-Type': effectiveType,
            },
            body: file,
          });

          if (!uploadResponse.ok) {
            throw new Error('\u4e0a\u4f20\u6587\u4ef6\u5230\u5b58\u50a8\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002');
          }

          const recordResponse = await fetchImpl(`/api/tasks/${taskId}/attachments`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              fileName: file.name,
              filePath: signPayload.path,
              contentType: effectiveType,
              size: file.size ?? 0,
            }),
          });

          const recordPayload = await recordResponse.json().catch(() => null);
          if (!recordResponse.ok || !recordPayload?.attachment) {
            const message =
              (recordPayload?.error as string | undefined) ?? '\u4fdd\u5b58\u9644\u4ef6\u4fe1\u606f\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002';
            throw new Error(message);
          }
        }

        setPendingAttachments([]);
        setAttachmentError(null);

        if (onAttachmentRecorded) {
          await onAttachmentRecorded(taskId);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '\u9644\u4ef6\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002';
        setAttachmentError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setUploadingAttachments(false);
      }
    },
    [fetchImpl, onAttachmentRecorded, pendingAttachments, supabase],
  );

  const createTask = useCallback(async () => {
    if (!orgId || !selectedGroupId || !userId) {
      setError('\u8bf7\u5148\u9009\u62e9\u6709\u6548\u7684\u7ec4\u7ec7\u548c\u5c0f\u7ec4\u3002');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('\u8bf7\u8f93\u5165\u4efb\u52a1\u6807\u9898\u3002');
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
        const message = err instanceof Error ? err.message : '附件上传失败，请稍后重试。';
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
    setIsOpen(false);
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
    isOpen,
    open,
    close,
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
