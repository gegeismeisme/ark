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
      <Text style={styles.taskTitle}>{assignment.task?.title ?? 'Untitled task'}</Text>
      <Text style={[styles.taskBadge, statusBadgeStyle(assignment.status)]}>
        {STATUS_LABELS[assignment.status]}
      </Text>
    </View>

    {assignment.task?.description ? (
      <Text style={styles.taskDesc}>{assignment.task.description}</Text>
    ) : null}

    <View style={styles.taskMeta}>
      <Text style={styles.taskMetaText}>
        Assigned: {formatDateTime(assignment.createdAt)}
      </Text>
      <Text style={styles.taskMetaText}>
        Due: {formatDateTime(assignment.task?.dueAt ?? null)}
      </Text>
    </View>

    <View style={styles.taskMeta}>
      <Text style={styles.taskMetaText}>
        Organization: {assignment.task?.organizationName ?? 'Unassigned'}
      </Text>
      <Text style={styles.taskMetaText}>
        Team: {assignment.task?.groupName ?? 'Unassigned'}
      </Text>
    </View>

    <View style={styles.taskReviewRow}>
      <Text style={styles.taskMetaText}>Review status:</Text>
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
        Reviewer note: {assignment.reviewNote}
      </Text>
    ) : null}

    {assignment.completionNote ? (
      <Text style={styles.taskNote}>My note: {assignment.completionNote}</Text>
    ) : null}

    <View style={styles.taskActions}>
      <Pressable
        style={({ pressed }) => [
          styles.actionSecondary,
          pressed && styles.buttonPressedLight,
        ]}
        onPress={() => onOpenDetailModal(assignment)}
      >
        <Text style={styles.actionSecondaryText}>View details</Text>
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
          <Text style={styles.actionPrimaryText}>Start task</Text>
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
            <Text style={styles.actionPrimaryText}>Submit update</Text>
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
            <Text style={styles.actionSecondaryText}>Mark as not started</Text>
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
            <Text style={styles.actionSecondaryText}>Edit note</Text>
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
            <Text style={styles.actionSecondaryText}>Reopen</Text>
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
          <Text style={styles.actionSecondaryText}>Reopen</Text>
        </Pressable>
      ) : null}
    </View>
  </View>
);
