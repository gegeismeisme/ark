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

import type { Assignment, TaskAttachment } from '../../../types';
import { styles } from '../../../styles/appStyles';
import type { AttachmentState } from '../hooks/useTaskAttachments';
import { AttachmentPanel } from './AttachmentPanel';

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
  onUploadAttachment: () => Promise<void>;
  onRefreshAttachments: () => Promise<void>;
  onDownloadAttachment: (attachment: TaskAttachment) => Promise<void>;
  canUploadAttachment: boolean;
  currentUserId: string | null;
  formatAttachmentDate: (value: string) => string;
};

const MODE_COPY: Record<
  ModalMode,
  {
    title: string;
    description: string;
    placeholder: string;
    primaryLabel: string | null;
  }
> = {
  complete: {
    title: '提交完成',
    description: '请补充执行情况或成果摘要，便于管理员快速验收。',
    placeholder: '记录执行过程、遇到的问题或关键成果（可留空）。',
    primaryLabel: '确认提交',
  },
  edit: {
    title: '更新完成说明',
    description: '可更新执行说明，保存后会同步给管理员审核。',
    placeholder: '更新执行说明，补充备注或说明后续计划（可留空）。',
    primaryLabel: '保存说明',
  },
  view: {
    title: '任务附件',
    description: '查看任务附件并可提前上传资料，准备完成前先整理更安心。',
    placeholder: '',
    primaryLabel: null,
  },
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
}) => {
  const copy = MODE_COPY[mode];
  const showNoteInput = mode === 'complete' || mode === 'edit';

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
              />
              <View style={styles.modalHintRow}>
                <Text style={styles.modalHint}>
                  {noteDraft.trim().length}/{maxNoteLength}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.modalReadOnlyNote}>
              <Text style={styles.modalReadOnlyLabel}>执行说明</Text>
              <Text style={styles.modalReadOnlyValue}>
                {assignment?.completionNote?.trim() ?? '暂无说明'}
              </Text>
            </View>
          )}

          {assignment?.task?.id && attachmentsState ? (
            <AttachmentPanel
              title="任务附件"
              state={attachmentsState}
              attachments={attachments}
              requireAttachment={requireAttachment}
              missingRequiredAttachment={missingRequiredAttachment}
              maxAttachmentSizeLabel={maxAttachmentSizeLabel}
              onUpload={onUploadAttachment}
              onRefresh={onRefreshAttachments}
              onDownload={onDownloadAttachment}
              canUpload={canUploadAttachment}
              currentUserId={currentUserId}
              formatAttachmentDate={formatAttachmentDate}
            />
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={onCancel}
              disabled={submitting}
            >
              <Text style={styles.modalButtonSecondaryText}>关闭</Text>
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






