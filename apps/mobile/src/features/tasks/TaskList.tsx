'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { STATUS_OPTIONS } from '../../constants';
import type { Assignment, AssignmentStatus, TaskAttachment } from '../../types';
import { styles } from '../../styles/appStyles';
import { AssignmentCard } from './components/AssignmentCard';
import { CompletionModal } from './components/CompletionModal';
import { useTaskAttachments } from './hooks/useTaskAttachments';

type TaskListProps = {
  assignments: Assignment[];
  formatDateTime: (value: string | null) => string;
  loading: boolean;
  error: string | null;
  statusFilter: 'all' | AssignmentStatus;
  onStatusFilterChange: (value: 'all' | AssignmentStatus) => void;
  onUpdateStatus: (
    assignmentId: string,
    nextStatus: AssignmentStatus,
    options?: { completionNote?: string | null }
  ) => Promise<boolean>;
  currentUserId: string | null;
};

type ModalMode = 'complete' | 'edit';

type ModalState = {
  assignment: Assignment;
  mode: ModalMode;
} | null;

const NOTE_MAX_LENGTH = 300;

export function TaskList({
  assignments,
  formatDateTime,
  loading,
  error,
  statusFilter,
  onStatusFilterChange,
  onUpdateStatus,
  currentUserId,
}: TaskListProps) {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const {
    getState: getAttachmentState,
    ensureLoaded: ensureAttachmentsLoaded,
    refresh: refreshAttachments,
    upload: uploadAttachment,
    download: downloadAttachment,
    maxAttachmentSizeLabel,
    hasOwnAttachment,
  } = useTaskAttachments({ currentUserId });

  useEffect(() => {
    assignments.forEach((assignment) => {
      if (assignment.task?.id) {
        void ensureAttachmentsLoaded(assignment.task.id).catch(() => undefined);
      }
    });
  }, [assignments, ensureAttachmentsLoaded]);

  const reminders = useMemo(() => deriveReminders(assignments), [assignments]);

  const filteredAssignments = useMemo(() => {
    if (statusFilter === 'all') return assignments;
    return assignments.filter((assignment) => assignment.status === statusFilter);
  }, [assignments, statusFilter]);

  const isUpdating = useCallback(
    (assignmentId: string) => updatingId === assignmentId,
    [updatingId]
  );

  const formatAttachmentDate = useCallback(
    (value: string) => formatDateTime(value) ?? value,
    [formatDateTime]
  );

  const handleUploadForTask = useCallback(
    async (taskId: string | null): Promise<void> => {
      if (!taskId) {
        return;
      }

      try {
        await uploadAttachment(taskId);
      } catch (err) {
        if (err instanceof Error) {
          Alert.alert('上传失败', err.message);
        }
      }
    },
    [uploadAttachment]
  );

  const handleRefreshForTask = useCallback(
    async (taskId: string | null): Promise<void> => {
      if (!taskId) {
        return;
      }

      await refreshAttachments(taskId);
    },
    [refreshAttachments]
  );

  const handleDownloadForTask = useCallback(
    async (taskId: string | null, attachment: TaskAttachment): Promise<void> => {
      if (!taskId) {
        return;
      }

      try {
        await downloadAttachment(taskId, attachment);
      } catch (err) {
        if (err instanceof Error) {
          Alert.alert('打开失败', err.message);
        }
      }
    },
    [downloadAttachment]
  );

  const runUpdate = useCallback(
    async (
      assignment: Assignment,
      nextStatus: AssignmentStatus,
      options?: { completionNote?: string | null }
    ) => {
      setUpdatingId(assignment.id);
      try {
        const success = await onUpdateStatus(assignment.id, nextStatus, options);
        if (!success) return false;
        return true;
      } finally {
        setUpdatingId(null);
      }
    },
    [onUpdateStatus]
  );

  const handleStart = useCallback(
    async (assignment: Assignment) => {
      await runUpdate(assignment, 'received');
    },
    [runUpdate]
  );

  const handleResetToSent = useCallback(
    async (assignment: Assignment) => {
      await runUpdate(assignment, 'sent');
    },
    [runUpdate]
  );

  const handleReopen = useCallback(
    async (assignment: Assignment) => {
      await runUpdate(assignment, 'received');
    },
    [runUpdate]
  );

  const openModal = useCallback((assignment: Assignment, mode: ModalMode) => {
    setModalState({ assignment, mode });
    setNoteDraft(assignment.completionNote ?? '');
    if (assignment.task?.id) {
      void ensureAttachmentsLoaded(assignment.task.id).catch(() => undefined);
    }
  }, [ensureAttachmentsLoaded]);

  const closeModal = useCallback(() => {
    setModalState(null);
    setNoteDraft('');
  }, []);

  const handleSubmitModal = useCallback(async () => {
    if (!modalState) return;
    const { assignment, mode } = modalState;
    const trimmed = noteDraft.trim();
    const note = trimmed.length > 0 ? trimmed : null;
    const success = await runUpdate(assignment, 'completed', { completionNote: note });
    if (success) {
      if (mode === 'complete') {
        Alert.alert('提交成功', '任务已提交，等待管理员审核。');
      } else {
        Alert.alert('保存成功', '说明已更新。');
      }
      closeModal();
    }
  }, [closeModal, modalState, noteDraft, runUpdate]);

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.loadingText}>正在加载任务...</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  const modalVisible = modalState !== null;
  const modalAssignment = modalState?.assignment ?? null;
  const modalSubmitting = modalAssignment ? isUpdating(modalAssignment.id) : false;
  const modalAttachmentsState = modalAssignment?.task?.id
    ? getAttachmentState(modalAssignment.task.id)
    : null;
  const modalAttachments = modalAttachmentsState?.attachments ?? [];
  const modalRequireAttachment = Boolean(modalAssignment?.task?.requireAttachment);
  const modalMissingAttachment =
    modalRequireAttachment && !hasOwnAttachment(modalAssignment?.task?.id);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>我的任务</Text>
      <Text style={styles.sectionHint}>按状态筛选任务，及时掌握执行进度。</Text>

      {reminders.length > 0 ? (
        <View style={styles.reminderStack}>
          {reminders.map((reminder) => (
            <View
              key={reminder.key}
              style={[
                styles.reminderCard,
                reminder.tone === 'warning'
                  ? styles.reminderCardWarning
                  : styles.reminderCardInfo,
              ]}
            >
              <Text
                style={[
                  styles.reminderText,
                  reminder.tone === 'warning'
                    ? styles.reminderTextWarning
                    : styles.reminderTextInfo,
                ]}
              >
                {reminder.message}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {STATUS_OPTIONS.map((option) => (
          <PressableChip
            key={option.value}
            label={option.label}
            active={statusFilter === option.value}
            onPress={() => onStatusFilterChange(option.value)}
          />
        ))}
      </ScrollView>

      {filteredAssignments.length === 0 ? (
        <Text style={styles.emptyText}>当前暂无任务</Text>
      ) : (
        filteredAssignments.map((assignment) => {
          const taskId = assignment.task?.id ?? null;
          const attachmentState = getAttachmentState(taskId);
          const attachments = attachmentState.attachments;
          const requireAttachment = Boolean(assignment.task?.requireAttachment);
          const missingRequiredAttachment =
            requireAttachment && !hasOwnAttachment(taskId);

          return (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              formatDateTime={formatDateTime}
              formatAttachmentDate={formatAttachmentDate}
              onStart={handleStart}
              onResetToSent={handleResetToSent}
              onReopen={handleReopen}
              onOpenCompleteModal={(item) => openModal(item, 'complete')}
              onOpenEditModal={(item) => openModal(item, 'edit')}
              attachmentsState={attachmentState}
              attachments={attachments}
              requireAttachment={requireAttachment}
              missingRequiredAttachment={missingRequiredAttachment}
              maxAttachmentSizeLabel={maxAttachmentSizeLabel}
              onUploadAttachment={() => handleUploadForTask(taskId)}
              onRefreshAttachments={() => handleRefreshForTask(taskId)}
              onDownloadAttachment={(attachment) =>
                handleDownloadForTask(taskId, attachment)
              }
              disableComplete={isUpdating(assignment.id) || missingRequiredAttachment}
              canUploadAttachment={assignment.status !== 'archived'}
              currentUserId={currentUserId}
              isUpdating={isUpdating(assignment.id)}
            />
          );
        })
      )}

      <CompletionModal
        visible={modalVisible}
        mode={modalState?.mode ?? 'complete'}
        assignment={modalAssignment}
        noteDraft={noteDraft}
        onChangeNote={setNoteDraft}
        onCancel={closeModal}
        onSubmit={() => void handleSubmitModal()}
        submitting={modalSubmitting}
        maxNoteLength={NOTE_MAX_LENGTH}
        attachmentsState={modalAttachmentsState}
        attachments={modalAttachments}
        requireAttachment={modalRequireAttachment}
        missingRequiredAttachment={modalMissingAttachment}
        maxAttachmentSizeLabel={maxAttachmentSizeLabel}
        onUploadAttachment={() =>
          handleUploadForTask(modalAssignment?.task?.id ?? null)
        }
        onRefreshAttachments={() =>
          handleRefreshForTask(modalAssignment?.task?.id ?? null)
        }
        onDownloadAttachment={(attachment) =>
          handleDownloadForTask(modalAssignment?.task?.id ?? null, attachment)
        }
        canUploadAttachment={Boolean(modalAssignment && modalAssignment.status !== 'archived')}
        currentUserId={currentUserId}
        formatAttachmentDate={(value) => formatDateTime(value) ?? ''}
      />
    </View>
  );
}

type Reminder = {
  key: string;
  tone: 'warning' | 'info';
  message: string;
};

const deriveReminders = (assignments: Assignment[]): Reminder[] => {
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  const pendingAssignments = assignments.filter(
    (assignment) => assignment.status !== 'completed' && assignment.status !== 'archived'
  );

  const overdueCount = pendingAssignments.filter((assignment) => {
    const dueAt = assignment.task?.dueAt;
    if (!dueAt) return false;
    const dueTime = new Date(dueAt).getTime();
    if (Number.isNaN(dueTime)) return false;
    return dueTime <= now;
  }).length;

  const dueSoonCount = pendingAssignments.filter((assignment) => {
    const dueAt = assignment.task?.dueAt;
    if (!dueAt) return false;
    const dueTime = new Date(dueAt).getTime();
    if (Number.isNaN(dueTime)) return false;
    if (dueTime <= now) return false;
    return dueTime - now <= oneDayMs;
  }).length;

  const changesRequestedCount = assignments.filter(
    (assignment) => assignment.reviewStatus === 'changes_requested'
  ).length;

  const list: Reminder[] = [];

  if (overdueCount > 0) {
    list.push({
      key: 'overdue',
      tone: 'warning',
      message: `有 ${overdueCount} 项任务已逾期，请尽快处理。`,
    });
  }

  if (dueSoonCount > 0) {
    list.push({
      key: 'dueSoon',
      tone: 'info',
      message: `未来 24 小时内有 ${dueSoonCount} 项任务到期。`,
    });
  }

  if (changesRequestedCount > 0) {
    list.push({
      key: 'changes',
      tone: 'info',
      message: `${changesRequestedCount} 项任务被退回，需要修改后重新提交。`,
    });
  }

  return list;
};

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const PressableChip = ({ label, active, onPress }: ChipProps) => (
  <Pressable
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
  </Pressable>
);










