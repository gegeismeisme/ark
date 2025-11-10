'use client';

import type { FC } from 'react';
import { Pressable, Text, View } from 'react-native';

import { REVIEW_STATUS_LABELS, STATUS_LABELS } from '../../../constants';
import { t } from '../../../i18n';
import type { Assignment } from '../../../types';
import { styles } from '../../../styles/appStyles';

type TaskDetailCardProps = {
  assignment: Assignment;
  formatDateTime: (value: string | null) => string;
  onStart: (assignment: Assignment) => Promise<void>;
  onResetToSent: (assignment: Assignment) => Promise<void>;
  onReopen: (assignment: Assignment) => Promise<void>;
  onOpenCompleteModal: (assignment: Assignment) => void;
  onOpenEditModal: (assignment: Assignment) => void;
  disableComplete: boolean;
  isUpdating: boolean;
  syncPending: boolean;
};

const statusBadgeStyle = (status: Assignment['status']) => {
  switch (status) {
    case 'received':
      return styles.taskBadgeInProgress;
    case 'completed':
      return styles.taskBadgeCompleted;
    case 'archived':
      return styles.taskBadgeArchived;
    default:
      return styles.taskBadgeSent;
  }
};

const reviewBadgeStyle = (status: Assignment['reviewStatus']) => {
  switch (status) {
    case 'accepted':
      return styles.reviewBadgeAccepted;
    case 'changes_requested':
      return styles.reviewBadgeChanges;
    default:
      return styles.reviewBadgePending;
  }
};

export const TaskDetailCard: FC<TaskDetailCardProps> = ({
  assignment,
  formatDateTime,
  onStart,
  onResetToSent,
  onReopen,
  onOpenCompleteModal,
  onOpenEditModal,
  disableComplete,
  isUpdating,
  syncPending,
}) => (
  <View style={styles.taskCard}>
    <View style={styles.taskHead}>
      <Text style={styles.taskTitle}>
        {assignment.task?.title ?? t('task.card.untitled')}
      </Text>
      <Text style={[styles.taskBadge, statusBadgeStyle(assignment.status)]}>
        {STATUS_LABELS[assignment.status]}
      </Text>
    </View>

    {syncPending ? (
      <View style={styles.taskSyncBadge}>
        <Text style={styles.taskSyncBadgeText}>{t('task.card.pendingSync')}</Text>
      </View>
    ) : null}

    {assignment.task?.description ? (
      <Text style={styles.taskDesc}>{assignment.task.description}</Text>
    ) : null}

    <View style={styles.taskMeta}>
      <Text style={styles.taskMetaText}>
        {t('task.card.assigned', { time: formatDateTime(assignment.createdAt) })}
      </Text>
      <Text style={styles.taskMetaText}>
        {t('task.card.due', { time: formatDateTime(assignment.task?.dueAt ?? null) })}
      </Text>
    </View>

    <View style={styles.taskMeta}>
      <Text style={styles.taskMetaText}>
        {t('task.card.organization', {
          name: assignment.task?.organizationName ?? t('common.notSet'),
        })}
      </Text>
      <Text style={styles.taskMetaText}>
        {t('task.card.group', {
          name: assignment.task?.groupName ?? t('common.notSet'),
        })}
      </Text>
    </View>

    <View style={styles.taskReviewRow}>
      <Text style={styles.taskMetaText}>{t('task.card.reviewStatus')}</Text>
      <Text style={[styles.reviewBadge, reviewBadgeStyle(assignment.reviewStatus)]}>
        {REVIEW_STATUS_LABELS[assignment.reviewStatus]}
      </Text>
    </View>

    {assignment.reviewNote ? (
      <Text
        style={[
          styles.taskReviewNote,
          assignment.reviewStatus === 'changes_requested' && styles.taskReviewNoteWarning,
        ]}
      >
        {t('task.card.reviewerNote', { note: assignment.reviewNote })}
      </Text>
    ) : null}

    {assignment.completionNote ? (
      <Text style={styles.taskNote}>
        {t('task.card.myNote', { note: assignment.completionNote })}
      </Text>
    ) : null}

    <View style={styles.taskActions}>
      {assignment.status === 'sent' ? (
        <Pressable
          disabled={isUpdating}
          style={({ pressed }) => [
            styles.actionPrimary,
            pressed && styles.buttonPressed,
            isUpdating && styles.buttonDisabled,
          ]}
          onPress={() => void onStart(assignment)}
        >
          <Text style={styles.actionPrimaryText}>{t('task.card.start')}</Text>
        </Pressable>
      ) : null}

      {assignment.status === 'received' ? (
        <>
          <Pressable
            disabled={disableComplete}
            style={({ pressed }) => [
              styles.actionPrimary,
              pressed && styles.buttonPressed,
              disableComplete && styles.buttonDisabled,
            ]}
            onPress={() => onOpenCompleteModal(assignment)}
          >
            <Text style={styles.actionPrimaryText}>{t('task.card.submit')}</Text>
          </Pressable>
          <Pressable
            disabled={isUpdating}
            style={({ pressed }) => [
              styles.actionSecondary,
              pressed && styles.buttonPressedLight,
              isUpdating && styles.buttonDisabled,
            ]}
            onPress={() => void onResetToSent(assignment)}
          >
            <Text style={styles.actionSecondaryText}>{t('task.card.reset')}</Text>
          </Pressable>
        </>
      ) : null}

      {assignment.status === 'completed' ? (
        <>
          <Pressable
            disabled={isUpdating}
            style={({ pressed }) => [
              styles.actionSecondary,
              pressed && styles.buttonPressedLight,
              isUpdating && styles.buttonDisabled,
            ]}
            onPress={() => onOpenEditModal(assignment)}
          >
            <Text style={styles.actionSecondaryText}>{t('task.card.edit')}</Text>
          </Pressable>
          <Pressable
            disabled={isUpdating}
            style={({ pressed }) => [
              styles.actionSecondary,
              pressed && styles.buttonPressedLight,
              isUpdating && styles.buttonDisabled,
            ]}
            onPress={() => void onReopen(assignment)}
          >
            <Text style={styles.actionSecondaryText}>{t('task.card.reopen')}</Text>
          </Pressable>
        </>
      ) : null}

      {assignment.status === 'archived' ? (
        <Pressable
          disabled={isUpdating}
          style={({ pressed }) => [
            styles.actionSecondary,
            pressed && styles.buttonPressedLight,
            isUpdating && styles.buttonDisabled,
          ]}
          onPress={() => void onReopen(assignment)}
        >
          <Text style={styles.actionSecondaryText}>{t('task.card.reopen')}</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);
