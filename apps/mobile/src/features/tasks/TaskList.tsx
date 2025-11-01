import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { REVIEW_STATUS_LABELS, STATUS_LABELS, STATUS_OPTIONS } from '../../constants';
import type { Assignment, AssignmentStatus, ReviewStatus } from '../../types';
import { styles } from '../../styles/appStyles';

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
};

type ModalMode = 'complete' | 'edit';

type ModalState = {
  assignment: Assignment;
  mode: ModalMode;
} | null;

const NOTE_MAX_LENGTH = 300;

const statusBadgeStyle = (status: AssignmentStatus) => {
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

const reviewBadgeStyle = (status: ReviewStatus) => {
  switch (status) {
    case 'accepted':
      return styles.reviewBadgeAccepted;
    case 'changes_requested':
      return styles.reviewBadgeChanges;
    default:
      return styles.reviewBadgePending;
  }
};

export function TaskList({
  assignments,
  formatDateTime,
  loading,
  error,
  statusFilter,
  onStatusFilterChange,
  onUpdateStatus,
}: TaskListProps) {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const reminders = useMemo(() => {
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

    const list: Array<{ key: string; tone: 'warning' | 'info'; message: string }> = [];

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
  }, [assignments]);

  const isUpdating = (assignmentId: string) => updatingId === assignmentId;

  const openModal = (assignment: Assignment, mode: ModalMode) => {
    setModalState({ assignment, mode });
    setNoteDraft(assignment.completionNote ?? '');
  };

  const closeModal = () => {
    setModalState(null);
    setNoteDraft('');
  };

  const runUpdate = async (
    assignment: Assignment,
    nextStatus: AssignmentStatus,
    noteOverride?: string | null
  ) => {
    setUpdatingId(assignment.id);
    try {
      const options =
        noteOverride !== undefined ? { completionNote: noteOverride } : undefined;
      return await onUpdateStatus(assignment.id, nextStatus, options);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStart = async (assignment: Assignment) => {
    await runUpdate(assignment, 'received');
  };

  const handleResetToSent = async (assignment: Assignment) => {
    await runUpdate(assignment, 'sent');
  };

  const handleReopen = async (assignment: Assignment) => {
    await runUpdate(assignment, 'received');
  };

  const handleSubmitModal = async () => {
    if (!modalState) return;
    const { assignment } = modalState;
    const trimmed = noteDraft.trim();
    const note = trimmed.length > 0 ? trimmed : null;
    const success = await runUpdate(assignment, 'completed', note);
    if (success) {
      closeModal();
    }
  };

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
  const modalTitle = modalState?.mode === 'complete' ? '提交完成' : '更新完成说明';
  const modalDescription =
    modalState?.mode === 'complete'
      ? '描述你已完成的内容、成果或需要同步的信息，方便管理员验收。'
      : '更新完成说明，补充进度或回应反馈，帮助管理员确认任务结果。';
  const noteLength = noteDraft.trim().length;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>我的任务</Text>
      <Text style={styles.sectionHint}>按状态筛选任务，及时更新执行进度。</Text>

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
          <Pressable
            key={option.value}
            style={[styles.chip, statusFilter === option.value && styles.chipActive]}
            onPress={() => onStatusFilterChange(option.value)}
          >
            <Text
              style={[styles.chipLabel, statusFilter === option.value && styles.chipLabelActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {assignments.length === 0 ? (
        <Text style={styles.emptyText}>当前没有符合条件的任务。</Text>
      ) : (
        assignments.map((assignment) => (
          <View key={assignment.id} style={styles.taskCard}>
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
                  assignment.reviewStatus === 'changes_requested' &&
                    styles.taskReviewNoteWarning,
                ]}
              >
                审核备注：{assignment.reviewNote}
              </Text>
            ) : null}

            {assignment.completionNote ? (
              <Text style={styles.taskNote}>我的说明：{assignment.completionNote}</Text>
            ) : null}

            <View style={styles.taskActions}>
              {assignment.status === 'sent' ? (
                <Pressable
                  disabled={isUpdating(assignment.id)}
                  style={({ pressed }) => [
                    styles.actionPrimary,
                    pressed && styles.buttonPressed,
                    isUpdating(assignment.id) && styles.buttonDisabled,
                  ]}
                  onPress={() => void handleStart(assignment)}
                >
                  <Text style={styles.actionPrimaryText}>开始执行</Text>
                </Pressable>
              ) : null}

              {assignment.status === 'received' ? (
                <>
                  <Pressable
                    disabled={isUpdating(assignment.id)}
                    style={({ pressed }) => [
                      styles.actionPrimary,
                      pressed && styles.buttonPressed,
                      isUpdating(assignment.id) && styles.buttonDisabled,
                    ]}
                    onPress={() => openModal(assignment, 'complete')}
                  >
                    <Text style={styles.actionPrimaryText}>提交完成</Text>
                  </Pressable>
                  <Pressable
                    disabled={isUpdating(assignment.id)}
                    style={({ pressed }) => [
                      styles.actionSecondary,
                      pressed && styles.buttonPressedLight,
                      isUpdating(assignment.id) && styles.buttonDisabled,
                    ]}
                    onPress={() => void handleResetToSent(assignment)}
                  >
                    <Text style={styles.actionSecondaryText}>标记为未开始</Text>
                  </Pressable>
                </>
              ) : null}

              {assignment.status === 'completed' ? (
                <>
                  <Pressable
                    disabled={isUpdating(assignment.id)}
                    style={({ pressed }) => [
                      styles.actionSecondary,
                      pressed && styles.buttonPressedLight,
                      isUpdating(assignment.id) && styles.buttonDisabled,
                    ]}
                    onPress={() => openModal(assignment, 'edit')}
                  >
                    <Text style={styles.actionSecondaryText}>编辑说明</Text>
                  </Pressable>
                  <Pressable
                    disabled={isUpdating(assignment.id)}
                    style={({ pressed }) => [
                      styles.actionSecondary,
                      pressed && styles.buttonPressedLight,
                      isUpdating(assignment.id) && styles.buttonDisabled,
                    ]}
                    onPress={() => void handleReopen(assignment)}
                  >
                    <Text style={styles.actionSecondaryText}>重新开启</Text>
                  </Pressable>
                </>
              ) : null}

              {assignment.status === 'archived' ? (
                <Pressable
                  disabled={isUpdating(assignment.id)}
                  style={({ pressed }) => [
                    styles.actionSecondary,
                    pressed && styles.buttonPressedLight,
                    isUpdating(assignment.id) && styles.buttonDisabled,
                  ]}
                  onPress={() => void handleReopen(assignment)}
                >
                  <Text style={styles.actionSecondaryText}>重新开启</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.attachmentNotice}>
              <Text style={styles.attachmentNoticeTitle}>附件上传即将上线</Text>
              <Text style={styles.attachmentNoticeText}>
                我们会尽快开放任务附件的上传与查看功能。当前如需提交图片或视频，请在说明中注明或联系管理员。
              </Text>
            </View>
          </View>
        ))
      )}

      <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Text style={styles.modalDescription}>{modalDescription}</Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder="描述执行过程、成果或需要协调的事项（可留空）"
              style={styles.modalInput}
              multiline
              numberOfLines={5}
              maxLength={NOTE_MAX_LENGTH}
              textAlignVertical="top"
              autoFocus
            />
            <View style={styles.modalFooter}>
              <Text style={styles.modalHint}>
                {noteLength}/{NOTE_MAX_LENGTH}
              </Text>
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={closeModal}
                  disabled={modalSubmitting}
                >
                  <Text style={styles.modalButtonSecondaryText}>取消</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    modalSubmitting && styles.buttonDisabled,
                  ]}
                  onPress={() => void handleSubmitModal()}
                  disabled={modalSubmitting}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    {modalState?.mode === 'complete' ? '提交完成' : '保存说明'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
