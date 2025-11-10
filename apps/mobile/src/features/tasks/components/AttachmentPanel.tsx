'use client';

import type { FC } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { t } from '../../../i18n';
import type { TaskAttachment } from '../../../types';
import { styles } from '../../../styles/appStyles';
import type { AttachmentState } from '../hooks/useTaskAttachments';
import type { PendingAttachmentUpload } from '../../../lib/storage/pendingAttachmentUploads';

type AttachmentPanelProps = {
  title: string;
  state: AttachmentState;
  attachments: TaskAttachment[];
  requireAttachment: boolean;
  missingRequiredAttachment: boolean;
  maxAttachmentSizeLabel: string;
  currentUserId: string | null;
  formatAttachmentDate: (value: string) => string;
  onUpload?: () => Promise<void> | void;
  onRefresh: () => Promise<void> | void;
  onDownload: (attachment: TaskAttachment) => Promise<void> | void;
  variant?: 'submit' | 'view';
  pendingUploads?: PendingAttachmentUpload[];
  retryingPendingId?: string | null;
  onRetryPendingUpload?: (pendingId: string) => Promise<void> | void;
  onRemovePendingUpload?: (pendingId: string) => Promise<void> | void;
};

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) {
    const value = bytes / 1024;
    return value >= 10 ? `${Math.round(value)} KB` : `${value.toFixed(1)} KB`;
  }
  const value = bytes / (1024 * 1024);
  return value >= 10 ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
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
  variant = 'submit',
  pendingUploads,
  retryingPendingId,
  onRetryPendingUpload,
  onRemovePendingUpload,
}) => {
  const allowUpload = variant !== 'view' && Boolean(onUpload);

  const statusMessage = (() => {
    if (variant === 'view') {
      return attachments.length > 0
        ? t('task.attachments.viewDesc')
        : t('task.attachments.viewEmpty');
    }
    if (requireAttachment) {
      return missingRequiredAttachment
        ? t('task.attachments.submitRequired')
        : t('task.attachments.submitSatisfied');
    }
    return attachments.length > 0
      ? t('task.attachments.optionalProvided')
      : t('task.attachments.optionalEmpty');
  })();

  const pendingList = pendingUploads ?? state.pendingUploads ?? [];

  return (
    <View style={styles.attachmentSection}>
      <View style={styles.attachmentHeaderRow}>
        <View style={styles.attachmentTitleRow}>
          <Text style={styles.attachmentTitle}>{title}</Text>
          {requireAttachment ? (
            <Text
              style={[
                styles.attachmentRequiredBadge,
                variant !== 'view' && !missingRequiredAttachment && styles.attachmentRequiredBadgeMet,
              ]}
            >
              {missingRequiredAttachment
                ? t('task.attachments.required')
                : t('task.attachments.met')}
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
        {statusMessage}
      </Text>

      {state.error ? <Text style={styles.attachmentError}>{state.error}</Text> : null}

      <View style={styles.attachmentList}>
        {attachments.length > 0 ? (
          attachments.map((attachment, index) => (
            <Pressable
              key={attachment.id}
              style={[styles.attachmentItem, index === 0 && styles.attachmentItemFirst]}
              onPress={() => void onDownload(attachment)}
            >
              <View style={styles.attachmentItemRow}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {attachment.fileName}
                </Text>
                {state.downloadingId === attachment.id ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <Text style={styles.attachmentDownloadText}>{t('task.attachments.viewAction')}</Text>
                )}
              </View>
              <Text style={styles.attachmentMeta}>
                {`${formatFileSize(attachment.sizeBytes)} · ${formatAttachmentDate(
                  attachment.uploadedAt,
                )} · ${
                  attachment.uploadedBy && attachment.uploadedBy === currentUserId
                    ? t('task.attachments.uploadedByMe')
                    : attachment.uploadedBy
                    ? t('task.attachments.uploadedByOther')
                    : t('task.attachments.systemRecord')
                }`}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.attachmentEmpty}>{t('task.attachments.empty')}</Text>
        )}
      </View>

      {pendingList.length > 0 ? (
        <View style={styles.attachmentPendingSection}>
          <Text style={styles.attachmentPendingTitle}>
            {t('task.attachments.pendingSectionTitle')}
          </Text>
          {pendingList.map((pending) => (
            <View key={pending.id} style={styles.attachmentPendingItem}>
              <View style={styles.attachmentPendingInfo}>
                <Text style={styles.attachmentName} numberOfLines={1}>
                  {pending.fileName}
                </Text>
                <Text style={styles.attachmentPendingMeta}>
                  {`${formatFileSize(pending.size)} · ${formatAttachmentDate(pending.createdAt)}`}
                </Text>
                {pending.lastError ? (
                  <Text style={styles.attachmentPendingError}>
                    {t('task.attachments.pendingError', { error: pending.lastError })}
                  </Text>
                ) : null}
              </View>
              <View style={styles.attachmentPendingActions}>
                {allowUpload && onRetryPendingUpload ? (
                  <Pressable
                    style={[
                      styles.attachmentPendingAction,
                      retryingPendingId === pending.id && styles.buttonDisabled,
                    ]}
                    onPress={() => onRetryPendingUpload(pending.id)}
                    disabled={retryingPendingId === pending.id}
                  >
                    {retryingPendingId === pending.id ? (
                      <ActivityIndicator size="small" color="#111827" />
                    ) : (
                      <Text style={styles.attachmentPendingActionText}>
                        {t('task.attachments.pendingRetry')}
                      </Text>
                    )}
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.attachmentPendingRemove}
                  onPress={() => onRemovePendingUpload?.(pending.id)}
                >
                  <Text style={styles.attachmentPendingRemoveText}>
                    {t('task.attachments.pendingRemove')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.attachmentButtonRow}>
        {allowUpload ? (
          <Pressable
            style={[styles.attachmentButton, state.uploading && styles.buttonDisabled]}
            onPress={() => onUpload && void onUpload()}
            disabled={state.uploading}
          >
            {state.uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.attachmentButtonText}>{t('task.attachments.upload')}</Text>
            )}
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.attachmentRefreshButton, state.loading && styles.buttonDisabled]}
          onPress={() => void onRefresh()}
          disabled={state.loading}
        >
          <Text style={styles.attachmentRefreshText}>{t('task.attachments.refresh')}</Text>
        </Pressable>
      </View>

      <Text style={styles.attachmentHint}>
        {variant === 'view'
          ? t('task.attachments.viewHint')
          : t('task.attachments.sizeHint', { size: maxAttachmentSizeLabel })}
      </Text>
    </View>
  );
};
