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

type CompletionModalProps = {
  visible: boolean;
  mode: 'complete' | 'edit';
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
}) => (
  <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
    <View style={styles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalCard}
      >
        <Text style={styles.modalTitle}>
          {mode === 'complete' ? '提交完成' : '更新完成说明'}
        </Text>
        <Text style={styles.modalDescription}>
          {mode === 'complete'
            ? '请补充执行情况或成果摘要，方便管理员快速验收。'
            : '可更新执行说明，保存后会同步给管理员审核。'}
        </Text>
        <TextInput
          value={noteDraft}
          onChangeText={onChangeNote}
          placeholder="记录执行过程、遇到的问题或关键成果（可留空）。"
          style={styles.modalInput}
          multiline
          numberOfLines={5}
          maxLength={maxNoteLength}
          textAlignVertical="top"
          autoFocus
        />
        <View style={styles.modalHintRow}>
          <Text style={styles.modalHint}>
            {noteDraft.trim().length}/{maxNoteLength}
          </Text>
        </View>

        {assignment?.task?.id && attachmentsState ? (
          <AttachmentPanel
            title="完成附件"
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
            <Text style={styles.modalButtonSecondaryText}>取消</Text>
          </Pressable>
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
            <Text style={styles.modalButtonPrimaryText}>
              {mode === 'complete' ? '确认提交' : '保存说明'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);
