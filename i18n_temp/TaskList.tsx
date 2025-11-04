'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { STATUS_LABELS, STATUS_OPTIONS } from '../../constants';
import type { Assignment, AssignmentStatus, TaskAttachment } from '../../types';
import { styles } from '../../styles/appStyles';
import { AssignmentCard } from './components/AssignmentCard';
import { CompletionModal } from './components/CompletionModal';
import { useTaskAttachments } from './hooks/useTaskAttachments';
import type { AttachmentState } from './hooks/useTaskAttachments';

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

type ModalMode = 'complete' | 'edit' | 'view';

type ModalState = {
  assignment: Assignment;
  mode: ModalMode;
} | null;

const NOTE_MAX_LENGTH = 300;
const SECTION_ORDER: AssignmentStatus[] = ['sent', 'received', 'completed', 'archived'];
const SECTION_DESCRIPTIONS: Record<AssignmentStatus, string> = {
  sent: '待接受的任务，请尽快确认并开始执行。',
  received: '执行中的任务，按计划推进并及时提交完成。',
  completed: '已提交完成的任务，等待管理员验收。',
  archived: '已归档任务，可随时查看历史记录。',
};

const EMPTY_ATTACHMENT_STATE: AttachmentState = {
  attachments: [],
  loading: false,
  loaded: false,
  error: null,
  uploading: false,
  downloadingId: null,
};

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

  const groupedAssignments = useMemo(() => {
    const sorted = [...assignments].sort((a, b) => {
      const dueA = a.task?.dueAt ? new Date(a.task.dueAt).getTime() : Infinity;
      const dueB = b.task?.dueAt ? new Date(b.task.dueAt).getTime() : Infinity;
      if (dueA !== dueB) return dueA - dueB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return sorted.reduce<Record<AssignmentStatus, Assignment[]>>(
      (acc, assignment) => {
        acc[assignment.status] = acc[assignment.status] ?? [];
        acc[assignment.status].push(assignment);
        return acc;
      },
      { sent: [], received: [], completed: [], archived: [] },
    );
  }, [assignments]);

  const statusCounts = useMemo(() => {
    const counts: Record<'all' | AssignmentStatus, number> = {
      all: assignments.length,
      sent: 0,
      received: 0,
      completed: 0,
      archived: 0,
    };
    assignments.forEach((assignment) => {
      counts[assignment.status] += 1;
    });
    return counts;
  }, [assignments]);

  const sections = useMemo(() => {
    if (statusFilter === 'all') return SECTION_ORDER;
    return SECTION_ORDER.filter((status) => status === statusFilter);
  }, [statusFilter]);

  const modalVisible = Boolean(modalState);
  const modalAssignment = modalState?.assignment ?? null;
  const modalAttachmentsState = modalAssignment?.task?.id
    ? getAttachmentState(modalAssignment.task.id)
    : EMPTY_ATTACHMENT_STATE;
  const modalAttachments = modalAttachmentsState.attachments;
  const modalRequireAttachment = modalAssignment?.task?.requireAttachment ?? false;
  const modalMissingAttachment =
    modalRequireAttachment &&
    (!modalAssignment?.task?.id || !hasOwnAttachment(modalAssignment.task.id));

  const handleOpenModal = useCallback(
    (assignment: Assignment, mode: ModalMode) => {
      setModalState({ assignment, mode });
      setNoteDraft(assignment.completionNote ?? '');
      if (assignment.task?.id) {
        void ensureAttachmentsLoaded(assignment.task.id).catch(() => undefined);
      }
    },
    [ensureAttachmentsLoaded],
  );

  const closeModal = () => {
    setModalState(null);
    setNoteDraft('');
  };

  const handleSubmitModal = useCallback(async () => {
    if (!modalAssignment || !modalState) return;
    if (modalState.mode === 'view') {
      closeModal();
      return;
    }

    setUpdatingId(modalAssignment.id);
    const nextStatus =
      modalState.mode === 'complete' ? 'completed' : modalAssignment.status;
    const success = await onUpdateStatus(modalAssignment.id, nextStatus, {
      completionNote: noteDraft.trim() || null,
    });
    setUpdatingId(null);

    if (success) {
      closeModal();
    }
  }, [modalAssignment, modalState, noteDraft, onUpdateStatus]);

  const handleStart = useCallback(
    async (assignment: Assignment) => {
      setUpdatingId(assignment.id);
      const success = await onUpdateStatus(assignment.id, 'received');
      setUpdatingId(null);
      if (!success) {
        Alert.alert('操作失败', '无法将任务标记为进行中，请稍后再试。');
      }
    },
    [onUpdateStatus],
  );

  const handleResetToSent = useCallback(
    async (assignment: Assignment) => {
      setUpdatingId(assignment.id);
      const success = await onUpdateStatus(assignment.id, 'sent');
      setUpdatingId(null);
      if (!success) {
        Alert.alert('操作失败', '无法将任务恢复为未开始状态，请稍后再试。');
      }
    },
    [onUpdateStatus],
  );

  const handleReopen = useCallback(
    async (assignment: Assignment) => {
      setUpdatingId(assignment.id);
      const success = await onUpdateStatus(assignment.id, 'received');
      setUpdatingId(null);
      if (!success) {
        Alert.alert('操作失败', '无法重新开启任务，请稍后再试。');
      }
    },
    [onUpdateStatus],
  );

  const handleUploadForTask = useCallback(
    async (taskId: string | null): Promise<void> => {
      if (!taskId) return;
      try {
        await uploadAttachment(taskId);
      } catch (err) {
        if (err instanceof Error) {
          Alert.alert('上传失败', err.message);
        }
      }
    },
    [uploadAttachment],
  );

  const handleRefreshForTask = useCallback(
    async (taskId: string | null): Promise<void> => {
      if (!taskId) return;
      await refreshAttachments(taskId);
    },
    [refreshAttachments],
  );

  const handleDownloadForTask = useCallback(
    async (taskId: string | null, attachment: TaskAttachment): Promise<void> => {
      if (!taskId) return;
      try {
        await downloadAttachment(taskId, attachment);
      } catch (err) {
        if (err instanceof Error) {
          Alert.alert('打开失败', err.message);
        }
      }
    },
    [downloadAttachment],
  );

  const renderAssignments = useCallback(
    (items: Assignment[]) =>
      items.map((assignment) => (
        <AssignmentCard
          key={assignment.id}
          assignment={assignment}
          formatDateTime={formatDateTime}
          onStart={handleStart}
          onResetToSent={handleResetToSent}
          onReopen={handleReopen}
          onOpenCompleteModal={(item) => handleOpenModal(item, 'complete')}
          onOpenEditModal={(item) => handleOpenModal(item, 'edit')}
          onOpenDetailModal={(item) => handleOpenModal(item, 'view')}
          disableComplete={
            updatingId !== null ||
            (assignment.task?.requireAttachment ?? false
              ? !hasOwnAttachment(assignment.task?.id)
              : false)
          }
          isUpdating={updatingId === assignment.id}
        />
      )),
    [
      formatDateTime,
      handleOpenModal,
      handleReopen,
      handleResetToSent,
      handleStart,
      hasOwnAttachment,
      updatingId,
    ],
  );

  return (
    <View style={styles.section}>
      <View style={styles.toggleRow}>
        <Pressable
          style={({ pressed }) => [
            styles.toggleButton,
            statusFilter === 'all' && styles.toggleButtonActive,
            pressed && styles.buttonPressedLight,
          ]}
          onPress={() => onStatusFilterChange('all')}
        >
          <Text
            style={[
              styles.toggleLabel,
              statusFilter === 'all' && styles.toggleLabelActive,
            ]}
          >
            全部 ({statusCounts.all})
          </Text>
        </Pressable>
        {STATUS_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={({ pressed }) => [
              styles.toggleButton,
              statusFilter === option.value && styles.toggleButtonActive,
              pressed && styles.buttonPressedLight,
            ]}
            onPress={() => onStatusFilterChange(option.value)}
          >
            <Text
              style={[
                styles.toggleLabel,
                statusFilter === option.value && styles.toggleLabelActive,
              ]}
            >
              {option.label} ({statusCounts[option.value]})
            </Text>
          </Pressable>
        ))}
      </View>

      {reminders.length > 0 ? (
        <View style={styles.reminderStack}>
          {reminders.map((item) => (
            <View
              key={item.key}
              style={[
                styles.reminderCard,
                item.tone === 'warning'
                  ? styles.reminderCardWarning
                  : styles.reminderCardInfo,
              ]}
            >
              <Text
                style={[
                  styles.reminderText,
                  item.tone === 'warning'
                    ? styles.reminderTextWarning
                    : styles.reminderTextInfo,
                ]}
              >
                {item.message}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>正在同步任务，请稍候…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.taskListContainer}>
        {sections.map((status) => (
          <View key={status} style={styles.taskSection}>
            <View style={styles.taskSectionHeader}>
              <Text style={styles.taskSectionTitle}>{STATUS_LABELS[status]}</Text>
              <Text style={styles.taskSectionCaption}>{SECTION_DESCRIPTIONS[status]}</Text>
            </View>

            {(groupedAssignments[status] ?? []).length === 0 ? (
              <View style={styles.placeholderCard}>
                <Text style={styles.placeholderTitle}>暂无该状态任务</Text>
                <Text style={styles.placeholderText}>
                  已完成的任务将显示，已归档记录仍然可查看。
                </Text>
              </View>
            ) : (
              <View style={styles.taskSectionBody}>
                {renderAssignments(groupedAssignments[status] ?? [])}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <CompletionModal
        visible={modalVisible}
        mode={modalState?.mode ?? 'complete'}
        assignment={modalAssignment}
        noteDraft={noteDraft}
        onChangeNote={setNoteDraft}
        onCancel={closeModal}
        onSubmit={() => void handleSubmitModal()}
        submitting={updatingId === modalAssignment?.id}
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
        canUploadAttachment={Boolean(
          modalAssignment?.task?.id && modalAssignment.status !== 'archived',
        )}
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
    (assignment) => assignment.status !== 'completed' && assignment.status !== 'archived',
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
    (assignment) => assignment.reviewStatus === 'changes_requested',
  ).length;

  const list: Reminder[] = [];

  if (overdueCount > 0) {
    list.push({
      key: 'overdue',
      tone: 'warning',
      message: `有 ${overdueCount} 项任务已逾期，请优先处理。`,
    });
  }

  if (dueSoonCount > 0) {
    list.push({
      key: 'dueSoon',
      tone: 'info',
      message: `未来 24 小时内有 ${dueSoonCount} 项任务即将到期。`,
    });
  }

  if (changesRequestedCount > 0) {
    list.push({
      key: 'changes',
      tone: 'info',
      message: `${changesRequestedCount} 项任务被要求调整，请根据备注尽快备许重提交。`,
    });
  }

  return list;
};







