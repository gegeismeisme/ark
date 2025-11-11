'use client';

import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

import { t } from '../../i18n';
import { getExpoExtras } from '../../lib/runtimeConfig';
import { supabase } from '../../lib/supabaseClient';
import type { TaskAttachment } from '../../types';

export type AttachmentSource = 'document' | 'camera' | 'video' | 'audio';

export type PickedAttachment = {
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

const extras = getExpoExtras();

const FALLBACK_MAX_SIZE = 20 * 1024 * 1024;
const BYTES_IN_KB = 1024;
const BYTES_IN_MB = BYTES_IN_KB * 1024;

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
const DEFAULT_IMAGE_NAME = 'photo';
const DEFAULT_VIDEO_NAME = 'video';
const DEFAULT_AUDIO_NAME = 'audio';

const getString = (value: unknown): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';

const getApiBaseUrl = (): string => {
  const extras = getExpoExtras();
  return (
    getString((extras as Record<string, unknown>).webBaseUrl) ||
    getString((extras as Record<string, unknown>).web_base_url) ||
    getString(process.env.EXPO_PUBLIC_WEB_BASE_URL)
  );
};

const resolveApiUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (!apiBaseUrl) {
    throw new Error(t('task.attachments.error.missingApiBase'));
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

  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}...` : trimmed;
};

const formatBytes = (bytes: number): string => {
  if (bytes >= BYTES_IN_MB) {
    return `${(bytes / BYTES_IN_MB).toFixed(1)} MB`;
  }
  if (bytes >= BYTES_IN_KB) {
    return `${Math.round(bytes / BYTES_IN_KB)} KB`;
  }
  return `${bytes} B`;
};

async function ensureWithinSizeLimit(file: PickedAttachment) {
  if (file.size && file.size > ATTACHMENT_MAX_SIZE) {
    throw new Error(
      t('task.attachments.error.fileTooLarge', {
        size: formatBytes(ATTACHMENT_MAX_SIZE),
      }),
    );
  }
}

async function getFileInfo(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && typeof info.size === 'number' ? info.size : 0;
}

const ensureCameraPermission = async () => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(t('task.attachments.error.cameraPermission'));
  }
};

const ensureAudioPermission = async () => {
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error(t('task.attachments.error.audioPermission'));
  }
};

const resetAudioMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
    });
  } catch {
    // ignore reset failures
  }
};

const captureCameraAsset = async (
  mediaTypes: ImagePicker.MediaTypeOptions,
): Promise<PickedAttachment | null> => {
  await ensureCameraPermission();
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes,
    quality: 0.85,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  const size = asset.fileSize ?? (await getFileInfo(asset.uri));
  const isImage = mediaTypes === ImagePicker.MediaTypeOptions.Images;

  return {
    uri: asset.uri,
    name:
      asset.fileName ??
      `${isImage ? DEFAULT_IMAGE_NAME : DEFAULT_VIDEO_NAME}-${Date.now()}.${
        isImage ? 'jpg' : 'mp4'
      }`,
    mimeType: asset.mimeType ?? (isImage ? 'image/jpeg' : 'video/mp4'),
    size,
  };
};

const pickDocumentAsset = async (): Promise<PickedAttachment | null> => {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: '*/*',
  });

  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  const size = asset.size ?? (await getFileInfo(asset.uri));

  return {
    uri: asset.uri,
    name: asset.name ?? `attachment-${Date.now()}`,
    mimeType: asset.mimeType ?? DEFAULT_MIME,
    size,
  };
};

const recordAudioAsset = async (): Promise<PickedAttachment | null> => {
  await ensureAudioPermission();
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();

  return new Promise<PickedAttachment | null>((resolve, reject) => {
    const stopIfNeeded = async () => {
      try {
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          await recording.stopAndUnloadAsync();
        }
      } catch {
        // ignore
      }
    };

    Alert.alert(
      t('task.attachments.recordingTitle'),
      t('task.attachments.recordingMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: async () => {
            try {
              await stopIfNeeded();
              const uri = recording.getURI();
              if (uri) {
                try {
                  await FileSystem.deleteAsync(uri, { idempotent: true });
                } catch {
                  // ignore delete failures
                }
              }
            } catch {
              // ignore
            }
            await resetAudioMode();
            resolve(null);
          },
        },
        {
          text: t('task.attachments.recordingStop'),
          onPress: async () => {
            try {
              await stopIfNeeded();
              const uri = recording.getURI();
              if (!uri) {
                throw new Error(t('task.attachments.error.recordingSave'));
              }
              const size = await getFileInfo(uri);
              await resetAudioMode();
              resolve({
                uri,
                name: `${DEFAULT_AUDIO_NAME}-${Date.now()}.m4a`,
                mimeType: 'audio/m4a',
                size,
              });
            } catch (error) {
              reject(error);
            }
          },
        },
      ],
      { cancelable: false },
    );
  });
};

export function useAttachmentActions(fetchImpl: typeof fetch = fetch) {
  const pickAttachment = useCallback(
    async (source: AttachmentSource = 'document'): Promise<PickedAttachment | null> => {
      let picked: PickedAttachment | null = null;
      if (source === 'camera') {
        picked = await captureCameraAsset(ImagePicker.MediaTypeOptions.Images);
      } else if (source === 'video') {
        picked = await captureCameraAsset(ImagePicker.MediaTypeOptions.Videos);
      } else if (source === 'audio') {
        picked = await recordAudioAsset();
      } else {
        picked = await pickDocumentAsset();
      }

      if (!picked) return null;
      await ensureWithinSizeLimit(picked);
      return picked;
    },
    [],
  );

  const listAttachments = useCallback(
    async (taskId: string): Promise<TaskAttachment[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;

      if (!accessToken) {
        throw new Error(t('task.attachments.error.auth'));
      }

      const response = await fetchImpl(resolveApiUrl(`/api/tasks/${taskId}/attachments`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(t('task.attachments.error.load'));
      }

      const raw = await response.text();
      const json = parseJsonSafe<{ attachments?: TaskAttachment[] }>(raw);
      if (!json || !Array.isArray(json.attachments)) {
        throw new Error(t('task.attachments.error.load'));
      }
      return json.attachments;
    },
    [fetchImpl],
  );

  const uploadAttachment = useCallback(
    async (taskId: string, file: PickedAttachment): Promise<TaskAttachment> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;

      if (!accessToken) {
        throw new Error(t('task.attachments.error.auth'));
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
        const message = extractErrorMessage(signRaw, t('task.attachments.error.signUpload'));
        throw new Error(message);
      }

      const uploadResult = await FileSystem.uploadAsync(signJson.url, file.uri, {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': file.mimeType || DEFAULT_MIME,
        },
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        throw new Error(t('task.attachments.error.uploadStorage'));
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
        const message = extractErrorMessage(recordRaw, t('task.attachments.error.record'));
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
        throw new Error(t('task.attachments.error.auth'));
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
        const message = extractErrorMessage(raw, t('task.attachments.error.signDownload'));
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
