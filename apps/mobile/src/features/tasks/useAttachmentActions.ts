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

type Extras = Record<string, unknown>;

type ExpoStaticConfig = {
  expoConfig?: {
    extra?: Extras;
  };
};

const asExtras = (value: unknown): Extras =>
  typeof value === 'object' && value !== null ? (value as Extras) : {};

const readExtras = (): Extras => {
  const configExtra = asExtras(Constants.expoConfig?.extra);
  const runtimeConstants = Constants as unknown as {
    manifest?: { extra?: Extras };
    manifest2?: { extra?: Extras };
  };

  const manifestExtra = asExtras(runtimeConstants.manifest?.extra);
  const manifest2Extra = asExtras(runtimeConstants.manifest2?.extra);

  const globalObject = globalThis as Record<string, unknown>;
  const expoConfigExtra = asExtras(
    (globalObject.expoConfig as { extra?: Extras } | undefined)?.extra
  );
  const staticConfigExtra = asExtras(
    (
      (globalObject.__expo_static_config__ as ExpoStaticConfig | undefined)?.expoConfig
        ?.extra ?? {}
    ) as Extras
  );

  return {
    ...expoConfigExtra,
    ...staticConfigExtra,
    ...manifestExtra,
    ...manifest2Extra,
    ...configExtra,
  };
};

const extras = readExtras();

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

const getString = (value: unknown): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';

const getApiBaseUrl = (): string =>
  getString(readExtras().webBaseUrl) || getString(process.env.EXPO_PUBLIC_WEB_BASE_URL);

const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error('尚未配置 API 基址，请在移动端环境变量中设置 EXPO_PUBLIC_WEB_BASE_URL。');
  }

  const base = apiBaseUrl.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
};

const parseJsonSafe = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const extractErrorMessage = (raw: string, fallback: string): string => {
  const parsed = parseJsonSafe<{ error?: unknown; message?: unknown; msg?: unknown }>(raw);
  const candidate =
    parsed && typeof parsed === 'object'
      ? [parsed.error, parsed.message, parsed.msg].find(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
      : undefined;

  if (candidate) {
    return candidate.trim();
  }

  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith('<')) {
    return fallback;
  }

  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
};

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
        throw new Error('文件过大，请压缩后再上传。');
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;

      if (!accessToken) {
        throw new Error('无法获取登录凭证，请重新登录后再试。');
      }

      const signResponse = await fetchImpl(resolveApiUrl('/api/storage/sign-upload'), {
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

      const signRaw = await signResponse.text();
      const signJson = parseJsonSafe<{ url?: string; path?: string }>(signRaw);

      if (
        !signResponse.ok ||
        !signJson ||
        typeof signJson.url !== 'string' ||
        typeof signJson.path !== 'string'
      ) {
        const message = extractErrorMessage(signRaw, '生成上传签名失败，请稍后重试。');
        throw new Error(message);
      }

      const uploadResult = await FileSystem.uploadAsync(signJson.url, file.uri, {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': file.mimeType || DEFAULT_MIME,
        },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error('上传到存储失败，请稍后重试。');
      }

      const recordResponse = await fetchImpl(resolveApiUrl(`/api/tasks/${taskId}/attachments`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          filePath: signJson.path,
          contentType: file.mimeType || DEFAULT_MIME,
          size: file.size ?? 0,
        }),
      });

      const recordRaw = await recordResponse.text();
      const recordJson = parseJsonSafe<AttachmentApiResponse>(recordRaw);
      const attachment = recordJson?.attachment;

      if (!recordResponse.ok || !attachment) {
        const message = extractErrorMessage(recordRaw, '保存附件信息失败，请稍后重试。');
        throw new Error(message);
      }

      return {
        id: attachment.id,
        taskId: attachment.task_id,
        fileName: attachment.file_name,
        filePath: attachment.file_path,
        contentType: attachment.content_type,
        sizeBytes: attachment.size_bytes,
        uploadedAt: attachment.uploaded_at,
        uploadedBy: attachment.uploaded_by,
      };
    },
    [fetchImpl],
  );

  const requestDownloadUrl = useCallback(
    async (path: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;

      if (!accessToken) {
        throw new Error('无法获取登录凭证，请重新登录后再试。');
      }

      const response = await fetchImpl(resolveApiUrl('/api/storage/sign-download'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({ path }),
      });

      const raw = await response.text();
      const json = parseJsonSafe<{ url?: string }>(raw);

      if (!response.ok || !json || typeof json.url !== 'string') {
        const message = extractErrorMessage(raw, '生成下载链接失败，请稍后重试。');
        throw new Error(message);
      }

      return json.url;
    },
    [fetchImpl],
  );

  return {
    pickAttachment,
    listAttachments,
    uploadAttachment,
    requestDownloadUrl,
    maxAttachmentSize: ATTACHMENT_MAX_SIZE,
  };
}






