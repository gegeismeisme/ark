'use client';

import type { FC } from 'react';
import { Pressable, Text, View } from 'react-native';

import { REVIEW_STATUS_LABELS, STATUS_LABELS } from '../../../constants';
import type { Assignment } from '../../../types';
import { styles } from '../../../styles/appStyles';

type AssignmentCardProps = {
  assignment: Assignment;
  formatDateTime: (value: string | null) => string;
  onStart: (assignment: Assignment) => Promise<void>;
  onResetToSent: (assignment: Assignment) => Promise<void>;
  onReopen: (assignment: Assignment) => Promise<void>;
  onOpenCompleteModal: (assignment: Assignment) => void;
  onOpenEditModal: (assignment: Assignment) => void;
  onOpenDetailModal: (assignment: Assignment) => void;
  disableComplete: boolean;
  isUpdating: boolean;
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

export const AssignmentCard: FC<AssignmentCardProps> = ({
  assignment,
  formatDateTime,
  onStart,
  onResetToSent,
  onReopen,
  onOpenCompleteModal,
  onOpenEditModal,
  onOpenDetailModal,
  disableComplete,
  isUpdating,
}) => (
  <View style={styles.taskCard}>
    <View style={styles.taskHead}>
      <Text style={styles.taskTitle}>{assignment.task?.title ?? '未命名任务'}</Text>
      <Text style={[styles.taskBadge, statusBadgeStyle(assignment.status)]}>
        {STATUS_LABELS[assignment.status]}
      </Text>
    </View>

    {assignment.task?.description ? (
      <Text style={styles.taskDesc}>{assignment.task.description}</Text>
    ) : null}

    <View style={styles.taskMeta}>
      <Text style={styles.taskMetaText}>
        派发时间：{formatDateTime(assignment.createdAt)}
      </Text>
      <Text style={styles.taskMetaText}>
        截止时间：{formatDateTime(assignment.task?.dueAt ?? null)}
      </Text>
    </View>

    <View style={styles.taskMeta}>
      <Text style={styles.taskMetaText}>
        组织：{assignment.task?.organizationName ?? '未指定组织'}
      </Text>
      <Text style={styles.taskMetaText}>
        小组：{assignment.task?.groupName ?? '未分配小组'}
      </Text>
    </View>

    <View style={styles.taskReviewRow}>
      <Text style={styles.taskMetaText}>验收状态：</Text>
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
        验收备注：{assignment.reviewNote}
      </Text>
    ) : null}

    {assignment.completionNote ? (
      <Text style={styles.taskNote}>我的说明：{assignment.completionNote}</Text>
    ) : null}

    <View style={styles.taskActions}>
      <Pressable
        style={({ pressed }) => [
          styles.actionSecondary,
          pressed && styles.buttonPressedLight,
        ]}
        onPress={() => onOpenDetailModal(assignment)}
      >
        <Text style={styles.actionSecondaryText}>查看详情</Text>
      </Pressable>

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
          <Text style={styles.actionPrimaryText}>接受任务</Text>
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
            <Text style={styles.actionPrimaryText}>提交完成</Text>
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
            <Text style={styles.actionSecondaryText}>标记为未开始</Text>
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
            <Text style={styles.actionSecondaryText}>更新说明</Text>
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
            <Text style={styles.actionSecondaryText}>重新开启</Text>
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
          <Text style={styles.actionSecondaryText}>重新开启</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);






