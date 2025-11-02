'use client';

import type { FC } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { TaskAttachment } from '../../../types';
import { styles } from '../../../styles/appStyles';
import type { AttachmentState } from '../hooks/useTaskAttachments';

type AttachmentPanelProps = {
  title: string;
  state: AttachmentState;
  attachments: TaskAttachment[];
  requireAttachment: boolean;
  missingRequiredAttachment: boolean;
  maxAttachmentSizeLabel: string;
  currentUserId: string | null;
  formatAttachmentDate: (value: string) => string;
  onUpload: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onDownload: (attachment: TaskAttachment) => Promise<void> | void;
  canUpload: boolean;
};

export const AttachmentPanel: FC<AttachmentPanelProps> = ({
  title,
  state,
  attachments,
  requireAttachment,
  missingRequiredAttachment,
  maxAttachmentSizeLabel,
  currentUserId,
  formatAttachmentDate,
  onUpload,
  onRefresh,
  onDownload,
  canUpload,
}) => (
  <View style={styles.attachmentSection}>
    <View style={styles.attachmentHeaderRow}>
      <View style={styles.attachmentTitleRow}>
        <Text style={styles.attachmentTitle}>{title}</Text>
        {requireAttachment ? (
          <Text
            style={[
              styles.attachmentRequiredBadge,
              !missingRequiredAttachment && styles.attachmentRequiredBadgeMet,
            ]}
          >
            {missingRequiredAttachment ? '需提交' : '已满足'}
          </Text>
        ) : null}
      </View>
      {state.loading ? <ActivityIndicator size="small" color="#111827" /> : null}
    </View>

    <Text
      style={[
        styles.attachmentStatusText,
        missingRequiredAttachment && styles.attachmentStatusWarning,
      ]}
    >
      {requireAttachment
        ? missingRequiredAttachment
          ? '该任务要求提交附件，请先上传后再完成。'
          : '已上传附件，可提交任务。'
        : attachments.length > 0
        ? '以下为任务关联的附件列表。'
        : '可按需上传任务补充材料。'}
    </Text>

    {state.error ? <Text style={styles.attachmentError}>{state.error}</Text> : null}

    <View style={styles.attachmentList}>
      {attachments.length > 0 ? (
        attachments.map((attachment, index) => (
          <Pressable
            key={attachment.id}
            style={[
              styles.attachmentItem,
              index === 0 && styles.attachmentItemFirst,
            ]}
            onPress={() => void onDownload(attachment)}
          >
            <View style={styles.attachmentItemRow}>
              <Text style={styles.attachmentName} numberOfLines={1}>
                {attachment.fileName}
              </Text>
              {state.downloadingId === attachment.id ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <Text style={styles.attachmentDownloadText}>查看</Text>
              )}
            </View>
            <Text style={styles.attachmentMeta}>
              {`${formatFileSize(attachment.sizeBytes)} · ${formatAttachmentDate(
                attachment.uploadedAt
              )} · ${resolveUploaderLabel(attachment.uploadedBy, currentUserId)}`}
            </Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.attachmentEmpty}>暂无附件</Text>
      )}
    </View>

    <View style={styles.attachmentButtonRow}>
      <Pressable
        style={[
          styles.attachmentButton,
          (!canUpload || state.uploading) && styles.buttonDisabled,
        ]}
        onPress={() => void onUpload()}
        disabled={!canUpload || state.uploading}
      >
        {state.uploading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Text style={styles.attachmentButtonText}>上传附件</Text>
        )}
      </Pressable>
      <Pressable
        style={[
          styles.attachmentRefreshButton,
          state.loading && styles.buttonDisabled,
        ]}
        onPress={() => void onRefresh()}
        disabled={state.loading}
      >
        <Text style={styles.attachmentRefreshText}>刷新列表</Text>
      </Pressable>
    </View>

    <Text style={styles.attachmentHint}>
      单个附件大小不超过 {maxAttachmentSizeLabel}
    </Text>
  </View>
);

const resolveUploaderLabel = (uploadedBy: string | null, currentUserId: string | null): string => {
  if (!uploadedBy) return '系统生成';
  if (currentUserId && uploadedBy === currentUserId) {
    return '我上传';
  }
  return '其他成员上传';
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    const value = bytes / 1024;
    return value >= 10 ? `${Math.round(value)} KB` : `${value.toFixed(1)} KB`;
  }

  const value = bytes / (1024 * 1024);
  return value >= 10 ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
};


