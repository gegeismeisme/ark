'use client';

import { useCallback, useState } from 'react';

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  ATTACHMENT_MAX_SIZE_BYTES,
  isAllowedContentType,
} from '@/lib/attachment-utils';
import type { AttachmentDraft } from '../../types';
import { useTranslations } from '@/lib/i18n/client';

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
  const t = useTranslations();
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
        setAttachmentError(t('dashboard.tasks.composer.attachments.errors.tooLarge'));
        return;
      }
      if (!isAllowedContentType(file.type)) {
        setAttachmentError(t('dashboard.tasks.composer.attachments.errors.unsupportedType'));
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
  }, [t]);

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
          throw new Error(t('dashboard.tasks.composer.attachments.errors.sessionMissing'));
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
              (signPayload?.error as string | undefined) ??
              t('dashboard.tasks.composer.attachments.errors.signatureFailed');
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
          throw new Error(t('dashboard.tasks.composer.attachments.errors.storageFailed'));
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
            (recordPayload?.error as string | undefined) ??
            t('dashboard.tasks.composer.attachments.errors.recordFailed');
          throw new Error(message);
        }
        }

        setPendingAttachments([]);
        setAttachmentError(null);

        if (onAttachmentRecorded) {
          await onAttachmentRecorded(taskId);
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t('dashboard.tasks.composer.attachments.errors.uploadFailed');
        setAttachmentError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setUploadingAttachments(false);
      }
    },
    [fetchImpl, onAttachmentRecorded, pendingAttachments, supabase, t],
  );

  const createTask = useCallback(async () => {
    if (!orgId || !selectedGroupId || !userId) {
      setError(t('dashboard.tasks.composer.errors.contextMissing'));
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('dashboard.tasks.composer.errors.titleMissing'));
      return;
    }

    if (selectedAssignees.length === 0) {
      setError(t('dashboard.tasks.composer.errors.assigneeMissing'));
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
        const message =
          err instanceof Error
            ? err.message
            : t('dashboard.tasks.composer.attachments.errors.uploadFailed');
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
    t,
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
