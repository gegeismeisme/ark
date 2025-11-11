'use client';

import type { AttachmentSource } from './useAttachmentActions';

export const ATTACHMENT_SOURCE_META: Record<
  AttachmentSource,
  { icon: string; labelKey: string }
> = {
  document: { icon: '🗂️', labelKey: 'task.attachments.source.document' },
  camera: { icon: '📷', labelKey: 'task.attachments.source.camera' },
  video: { icon: '🎥', labelKey: 'task.attachments.source.video' },
  audio: { icon: '🎙️', labelKey: 'task.attachments.source.audio' },
};

export const DEFAULT_ATTACHMENT_SOURCES: AttachmentSource[] = [
  'document',
  'camera',
  'video',
  'audio',
];
