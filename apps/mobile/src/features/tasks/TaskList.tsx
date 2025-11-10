'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { STATUS_LABELS, STATUS_OPTIONS } from '../../constants';
import { t } from '../../i18n';
import type { Assignment, AssignmentStatus, TaskAttachment } from '../../types';
import { styles } from '../../styles/appStyles';
import { AssignmentCard } from './components/AssignmentCard';
import { TaskDetailCard } from './components/TaskDetailCard';
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
  pendingAssignmentIds?: string[];
};

type ModalMode = 'complete' | 'edit' | 'view';

type ModalState = {
  assignment: Assignment;
  mode: ModalMode;
} | null;

const NOTE_MAX_LENGTH = 300;
const EMPTY_ATTACHMENT_STATE: AttachmentState = {
  attachments: [],
  loading: false,
  loaded: false,
  error: null,
  uploading: false,
  downloadingId: null,
  pendingUploads: [],
  retryingId: null,
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
  pendingAssignmentIds,
}: TaskListProps) {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dueFilter, setDueFilter] = useState<'all' | 'today' | 'week' | 'overdue'>('all');
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null);

  const {
    getState: getAttachmentState,
    ensureLoaded: ensureAttachmentsLoaded,
    refresh: refreshAttachments,
    upload: uploadAttachment,
    download: downloadAttachment,
    retryPendingUpload,
    removePendingUpload,
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

  const pendingAssignmentSet = useMemo(
    () => new Set(pendingAssignmentIds ?? []),
    [pendingAssignmentIds],
  );

  const filteredAssignments = useMemo(
    () => filterAssignmentsByDue(assignments, dueFilter),
    [assignments, dueFilter],
  );

  const sortedAssignments = useMemo(() => {
    return [...filteredAssignments].sort((a, b) => {
      const dueA = a.task?.dueAt ? new Date(a.task.dueAt).getTime() : Infinity;
      const dueB = b.task?.dueAt ? new Date(b.task.dueAt).getTime() : Infinity;
      if (dueA !== dueB) return dueA - dueB;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [filteredAssignments]);

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
        Alert.alert(t('task.list.alert.errorTitle'), t('task.list.alert.startFailed'));
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
        Alert.alert(t('task.list.alert.errorTitle'), t('task.list.alert.resetFailed'));
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
        Alert.alert(t('task.list.alert.errorTitle'), t('task.list.alert.reopenFailed'));
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
          Alert.alert(t('task.list.alert.uploadFailed'), err.message);
        }
      }
    },
    [uploadAttachment],
  );

  const handleRetryPendingAttachment = useCallback(
    async (taskId: string | null, pendingId: string) => {
      if (!taskId) return;
      await retryPendingUpload(taskId, pendingId);
    },
    [retryPendingUpload],
  );

  const handleRemovePendingAttachment = useCallback(
    async (taskId: string | null, pendingId: string) => {
      if (!taskId) return;
      await removePendingUpload(taskId, pendingId);
    },
    [removePendingUpload],
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
          Alert.alert(t('task.list.alert.downloadFailed'), err.message);
        }
      }
    },
    [downloadAttachment],
  );

  const handleOpenDetail = useCallback((assignment: Assignment) => {
    setDetailAssignment(assignment);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailAssignment(null);
  }, []);

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
            {t('status.all')} ({statusCounts.all})
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
      <View style={styles.chipRow}>
        {dueFilterOptions.map((option) => (
          <Pressable
            key={option}
            style={[styles.chip, dueFilter === option && styles.chipActive]}
            onPress={() => setDueFilter(option)}
          >
            <Text
              style={[styles.chipLabel, dueFilter === option && styles.chipLabelActive]}
            >
              {dueFilterIconMap[option]} {t(`task.list.dueFilters.${option}`)}
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
          <Text style={styles.loadingText}>{t('task.list.loading')}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.taskListContainer}>
        {sortedAssignments.length === 0 ? (
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderTitle}>{t('task.list.placeholderTitle')}</Text>
            <Text style={styles.placeholderText}>{t('task.list.placeholderBody')}</Text>
          </View>
        ) : (
          sortedAssignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              formatDateTime={formatDateTime}
              onPress={handleOpenDetail}
              syncPending={pendingAssignmentSet.has(assignment.id)}
            />
          ))
        )}
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
        onRetryPendingAttachment={(pendingId) =>
          handleRetryPendingAttachment(modalAssignment?.task?.id ?? null, pendingId)
        }
        onRemovePendingAttachment={(pendingId) =>
          handleRemovePendingAttachment(modalAssignment?.task?.id ?? null, pendingId)
        }
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
      message: t('task.list.reminder.overdue', { count: overdueCount }),
    });
  }

  if (dueSoonCount > 0) {
    list.push({
      key: 'dueSoon',
      tone: 'info',
      message: t('task.list.reminder.dueSoon', { count: dueSoonCount }),
    });
  }

  if (changesRequestedCount > 0) {
    list.push({
      key: 'changes',
      tone: 'info',
      message: t('task.list.reminder.changes', { count: changesRequestedCount }),
    });
  }

  return list;
};

const dueFilterOptions: Array<'all' | 'today' | 'week' | 'overdue'> = [
  'all',
  'today',
  'week',
  'overdue',
];

const dueFilterIconMap: Record<(typeof dueFilterOptions)[number], string> = {
  all: '✨',
  today: '🌤️',
  week: '📅',
  overdue: '⏰',
};

const filterAssignmentsByDue = (
  assignments: Assignment[],
  filter: 'all' | 'today' | 'week' | 'overdue',
) => {
  if (filter === 'all') return assignments;
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setHours(23, 59, 59, 999);
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  return assignments.filter((assignment) => {
    const dueAt = assignment.task?.dueAt;
    if (!dueAt) {
      return false;
    }
    const dueTime = new Date(dueAt).getTime();
    if (Number.isNaN(dueTime)) return false;

    if (filter === 'today') {
      return dueTime >= startOfToday.getTime() && dueTime <= endOfToday.getTime();
    }
    if (filter === 'week') {
      return dueTime >= now && dueTime <= now + oneWeekMs;
    }
    if (filter === 'overdue') {
      return dueTime < now;
    }
    return true;
  });
};







