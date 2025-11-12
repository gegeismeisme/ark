'use client';

import type { FC } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { t } from '../../../i18n';
import type { Assignment, TaskAttachment } from '../../../types';
import { styles } from '../../../styles/appStyles';
import type { AttachmentState } from '../hooks/useTaskAttachments';
import { AttachmentPanel } from './AttachmentPanel';
import type { AttachmentSource } from '../useAttachmentActions';
import { TaskTimeline } from './TaskTimeline';
import { ChecklistPreview } from './ChecklistPreview';

type ModalMode = 'complete' | 'edit' | 'view';

type CompletionModalProps = {
  visible: boolean;
  mode: ModalMode;
  assignment: Assignment | null;
  noteDraft: string;
  onChangeNote: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  maxNoteLength: number;
  attachmentsState: AttachmentState | null;
  attachments: TaskAttachment[];
  requireAttachment: boolean;
  missingRequiredAttachment: boolean;
  maxAttachmentSizeLabel: string;
  onUploadAttachment: (source: AttachmentSource) => Promise<void>;
  onRefreshAttachments: () => Promise<void>;
  onDownloadAttachment: (attachment: TaskAttachment) => Promise<void>;
  canUploadAttachment: boolean;
  currentUserId: string | null;
  formatAttachmentDate: (value: string | null) => string;
  onRetryPendingAttachment: (pendingId: string) => Promise<void>;
  onRemovePendingAttachment: (pendingId: string) => Promise<void>;
};

const MODAL_COPY: Record<
  ModalMode,
  {
    title: string;
    description: string;
    placeholder?: string;
    primaryLabel?: string;
  }
> = {
  complete: {
    title: t('task.modal.completeTitle'),
    description: t('task.modal.completeDescription'),
    placeholder: t('task.modal.completePlaceholder'),
    primaryLabel: t('task.modal.completeSubmit'),
  },
  edit: {
    title: t('task.modal.editTitle'),
    description: t('task.modal.editDescription'),
    placeholder: t('task.modal.editPlaceholder'),
    primaryLabel: t('task.modal.editSubmit'),
  },
  view: {
    title: t('task.modal.viewTitle'),
    description: t('task.modal.viewDescription'),
  },
};

const emptyState: AttachmentState = {
  attachments: [],
  loading: false,
  loaded: false,
  error: null,
  uploading: false,
  downloadingId: null,
  pendingUploads: [],
  retryingId: null,
};

export const CompletionModal: FC<CompletionModalProps> = ({
  visible,
  mode,
  assignment,
  noteDraft,
  onChangeNote,
  onCancel,
  onSubmit,
  submitting,
  maxNoteLength,
  attachmentsState,
  attachments,
  requireAttachment,
  missingRequiredAttachment,
  maxAttachmentSizeLabel,
  onUploadAttachment,
  onRefreshAttachments,
  onDownloadAttachment,
  canUploadAttachment,
  currentUserId,
  formatAttachmentDate,
  onRetryPendingAttachment,
  onRemovePendingAttachment,
}) => {
  const copy = MODAL_COPY[mode];
  const showNoteInput = mode === 'complete' || mode === 'edit';
  const state = attachmentsState ?? emptyState;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalCard}
        >
          <Text style={styles.modalTitle}>{copy.title}</Text>
          <Text style={styles.modalDescription}>{copy.description}</Text>

          {showNoteInput ? (
            <>
              <TextInput
                value={noteDraft}
                onChangeText={onChangeNote}
                placeholder={copy.placeholder}
                style={styles.modalInput}
                multiline
                numberOfLines={5}
                maxLength={maxNoteLength}
                textAlignVertical="top"
                autoFocus={mode === 'complete'}
                testID="completion-note-input"
              />
              <View style={styles.modalHintRow}>
                <Text style={styles.modalHint}>
                  {noteDraft.trim().length}/{maxNoteLength}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.modalReadOnlyNote}>
              <Text style={styles.modalReadOnlyLabel}>{t('task.modal.readOnlyLabel')}</Text>
              <Text style={styles.modalReadOnlyValue}>
                {assignment?.completionNote?.trim() ?? t('task.modal.readOnlyEmpty')}
              </Text>
            </View>
          )}

          <ChecklistPreview
            taskId={assignment?.task?.id ?? null}
            checklist={assignment?.task?.checklist ?? []}
            readOnly={mode === 'view'}
          />

          {assignment?.task?.id ? (
          <AttachmentPanel
            title={t('task.attachments.sectionTitle')}
            state={state}
            attachments={attachments}
            requireAttachment={requireAttachment}
            missingRequiredAttachment={missingRequiredAttachment}
            maxAttachmentSizeLabel={maxAttachmentSizeLabel}
            onUpload={mode === 'view' ? undefined : onUploadAttachment}
            onRefresh={onRefreshAttachments}
            onDownload={onDownloadAttachment}
              currentUserId={currentUserId}
              formatAttachmentDate={formatAttachmentDate}
              variant={mode === 'view' ? 'view' : 'submit'}
              pendingUploads={state.pendingUploads}
              retryingPendingId={state.retryingId}
              onRetryPendingUpload={onRetryPendingAttachment}
              onRemovePendingUpload={onRemovePendingAttachment}
            />
          ) : null}
          <TaskTimeline
            assignment={assignment}
            attachments={attachments}
            formatDateTime={formatAttachmentDate}
          />

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onCancel}
              disabled={submitting}
              testID="completion-close-button"
            >
              <Text style={styles.modalButtonSecondaryText}>{t('common.close')}</Text>
            </Pressable>
            {copy.primaryLabel ? (
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalButtonPrimary,
                  (submitting || (requireAttachment && missingRequiredAttachment)) &&
                    styles.buttonDisabled,
                ]}
                onPress={onSubmit}
                disabled={submitting || (requireAttachment && missingRequiredAttachment)}
                testID="completion-submit-button"
              >
                <Text style={styles.modalButtonPrimaryText}>{copy.primaryLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
