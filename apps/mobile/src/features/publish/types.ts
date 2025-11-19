import type { AttachmentSource, PickedAttachment } from '../tasks/useAttachmentActions';

export type AttachmentDraft = {
  id: string;
  source: AttachmentSource;
  file: PickedAttachment;
};

export type PublishStep = 0 | 1 | 2 | 3;
