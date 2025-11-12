'use client';

import type { FC } from 'react';
import { Pressable, Text, View } from 'react-native';

import { STATUS_LABELS } from '../../../constants';
import { t } from '../../../i18n';
import type { Assignment } from '../../../types';
import { styles } from '../../../styles/appStyles';

type AssignmentRowProps = {
  assignment: Assignment;
  formatDateTime: (value: string | null) => string;
  onPress: (assignment: Assignment) => void;
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

export const AssignmentCard: FC<AssignmentRowProps> = ({
  assignment,
  formatDateTime,
  onPress,
  syncPending,
}) => {
  const dueAt = assignment.task?.dueAt
    ? formatDateTime(assignment.task.dueAt)
    : t('task.list.noDueDate');

  return (
    <Pressable
      onPress={() => onPress(assignment)}
      style={({ pressed }) => [
        styles.taskRow,
        pressed && styles.buttonPressedLight,
      ]}
      testID={`assignment-card-${assignment.id}`}
    >
      <View style={styles.taskRowLeft}>
        <View style={styles.taskRowTitleRow}>
          <Text
            style={styles.taskRowTitle}
            numberOfLines={1}
          >
            {assignment.task?.title ?? t('task.card.untitled')}
          </Text>
          {syncPending ? (
            <Text style={styles.taskRowPending}>{t('task.card.pendingSync')}</Text>
          ) : null}
        </View>
        <Text style={styles.taskRowMeta} numberOfLines={1}>
          {dueAt}
        </Text>
        <Text style={styles.taskRowMeta} numberOfLines={1}>
          {assignment.task?.organizationName ?? t('common.notSet')} ·{' '}
          {assignment.task?.groupName ?? t('task.list.noGroup')}
        </Text>
      </View>
      <View style={styles.taskRowRight}>
        <Text style={[styles.taskBadge, statusBadgeStyle(assignment.status)]}>
          {STATUS_LABELS[assignment.status]}
        </Text>
      </View>
    </Pressable>
  );
};
