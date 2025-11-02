'use client';

import { useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

import { supabase } from '../../lib/supabaseClient';
import type { TaskAttachment } from '../../types';

type PickedAttachment = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
};

type AttachmentApiResponse = {
  attachment?: {
    id: string;
    task_id: string;
    organization_id: string;
    uploaded_by: string | null;
    file_name: string;
    file_path: string;
    content_type: string;
    size_bytes: number;
    uploaded_at: string;
  };
};

const extras = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const FALLBACK_MAX_SIZE = 20 * 1024 * 1024;

const parseToNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const ATTACHMENT_MAX_SIZE =
  parseToNumber(extras.attachmentMaxSize) ??
  parseToNumber((extras as Record<string, unknown>).storageMaxAttachmentSize) ??
  parseToNumber(process.env.STORAGE_MAX_ATTACHMENT_SIZE) ??
  FALLBACK_MAX_SIZE;

const DEFAULT_MIME = 'application/octet-stream';

export function useAttachmentActions(fetchImpl: typeof fetch = fetch) {
  const pickAttachment = useCallback(async (): Promise<PickedAttachment | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: '*/*',
    });

    if (result.canceled) return null;

    const asset = result.assets?.[0];
    if (!asset || !asset.uri) {
      return null;
    }

    return {
      uri: asset.uri,
      name: asset.name ?? 'attachment',
      mimeType: asset.mimeType ?? DEFAULT_MIME,
      size: asset.size ?? 0,
    };
  }, []);

  const listAttachments = useCallback(async (taskId: string): Promise<TaskAttachment[]> => {
    const { data, error } = await supabase
      .from('task_attachments')
      .select(
        'id, task_id, file_name, file_path, content_type, size_bytes, uploaded_at, uploaded_by'
      )
      .eq('task_id', taskId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (
      data?.map((row) => ({
        id: row.id,
        taskId: row.task_id,
        fileName: row.file_name,
        filePath: row.file_path,
        contentType: row.content_type,
        sizeBytes: row.size_bytes,
        uploadedAt: row.uploaded_at,
        uploadedBy: row.uploaded_by,
      })) ?? []
    );
  }, []);

  const uploadAttachment = useCallback(
    async (taskId: string, file: PickedAttachment): Promise<TaskAttachment> => {
      if (file.size && file.size > ATTACHMENT_MAX_SIZE) {
        throw new Error('附件大小超出限制，请压缩后再上传。');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;

      if (!accessToken) {
        throw new Error('无法获取登录凭证，请重新登录后再试。');
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
          contentType: file.mimeType || DEFAULT_MIME,
          size: file.size ?? 0,
        }),
      });

      if (!signResponse.ok) {
        const body = await signResponse.json().catch(() => ({}));
        throw new Error(body.error ?? '生成上传签名失败，请稍后重试。');
      }

      const { url, path } = (await signResponse.json()) as { url: string; path: string };

      const uploadResult = await FileSystem.uploadAsync(url, file.uri, {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': file.mimeType || DEFAULT_MIME,
        },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error('上传到存储失败，请稍后再试。');
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
          contentType: file.mimeType || DEFAULT_MIME,
          size: file.size ?? 0,
        }),
      });

      if (!recordResponse.ok) {
        const body = await recordResponse.json().catch(() => ({}));
        throw new Error(body.error ?? '保存附件信息失败，请稍后重试。');
      }

      const record = (await recordResponse.json()) as AttachmentApiResponse;
      if (!record.attachment) {
        throw new Error('附件信息返回异常，请稍后重试。');
      }

      return {
        id: record.attachment.id,
        taskId: record.attachment.task_id,
        fileName: record.attachment.file_name,
        filePath: record.attachment.file_path,
        contentType: record.attachment.content_type,
        sizeBytes: record.attachment.size_bytes,
        uploadedAt: record.attachment.uploaded_at,
        uploadedBy: record.attachment.uploaded_by,
      };
    },
    [fetchImpl]
  );

  const requestDownloadUrl = useCallback(
    async (path: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;

      if (!accessToken) {
        throw new Error('无法获取登录凭证，请重新登录后再试。');
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
        throw new Error(body.error ?? '生成下载链接失败，请稍后重试。');
      }

      const data = (await response.json()) as { url?: string };
      if (!data.url) {
        throw new Error('下载链接已失效，请稍后再试。');
      }

      return data.url;
    },
    [fetchImpl]
  );

  return {
    pickAttachment,
    listAttachments,
    uploadAttachment,
    requestDownloadUrl,
    maxAttachmentSize: ATTACHMENT_MAX_SIZE,
  };
}
