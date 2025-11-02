import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { REVIEW_STATUS_LABELS, STATUS_LABELS, STATUS_OPTIONS } from '../../constants';
import type { Assignment, AssignmentStatus, ReviewStatus, TaskAttachment } from '../../types';
import { styles } from '../../styles/appStyles';
import { useAttachmentActions } from './useAttachmentActions';

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

type AttachmentState = {
  attachments: TaskAttachment[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

const BYTES_IN_KB = 1024;
const BYTES_IN_MB = 1024 * 1024;

const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 KB';
  }

  if (bytes < BYTES_IN_KB) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < BYTES_IN_MB) {
    const value = bytes / BYTES_IN_KB;
    return value >= 10 ? `${Math.round(value)} KB` : `${value.toFixed(1)} KB`;
  }

  const value = bytes / BYTES_IN_MB;
  return value >= 10 ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
};

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
  currentUserId,
}: TaskListProps) {
  const [modalState, setModalState] = useState<ModalState>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const {
    pickAttachment,
    listAttachments,
    uploadAttachment,
    requestDownloadUrl,
    maxAttachmentSize,
  } = useAttachmentActions();
  const [attachmentMap, setAttachmentMap] = useState<Record<string, AttachmentState>>({});
  const attachmentMapRef = useRef<Record<string, AttachmentState>>({});
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);

  useEffect(() => {
    attachmentMapRef.current = attachmentMap;
  }, [attachmentMap]);

  const refreshAttachments = useCallback(
    async (taskId: string) => {
      setAttachmentMap((prev) => {
        const current = prev[taskId];
        return {
          ...prev,
          [taskId]: {
            attachments: current?.attachments ?? [],
            loading: true,
            loaded: current?.loaded ?? false,
            error: null,
          },
        };
      });

      try {
        const items = await listAttachments(taskId);
        setAttachmentMap((prev) => ({
          ...prev,
          [taskId]: { attachments: items, loading: false, loaded: true, error: null },
        }));
        return items;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件加载失败，请稍后再试。';
        setAttachmentMap((prev) => ({
          ...prev,
          [taskId]: {
            attachments: prev[taskId]?.attachments ?? [],
            loading: false,
            loaded: true,
            error: message,
          },
        }));
        throw err;
      }
    },
    [listAttachments]
  );

  useEffect(() => {
    const uniqueTaskIds = Array.from(
      new Set(
        assignments
          .map((assignment) => assignment.task?.id)
          .filter((value): value is string => Boolean(value))
      )
    );

    uniqueTaskIds.forEach((taskId) => {
      if (!attachmentMapRef.current[taskId]) {
        void refreshAttachments(taskId).catch(() => undefined);
      }
    });
  }, [assignments, refreshAttachments]);

  const maxAttachmentSizeLabel = useMemo(() => {
    if (!Number.isFinite(maxAttachmentSize) || maxAttachmentSize <= 0) {
      return '20 MB';
    }

    if (maxAttachmentSize >= BYTES_IN_MB) {
      const value = maxAttachmentSize / BYTES_IN_MB;
      return value >= 10 ? `${Math.round(value)} MB` : `${value.toFixed(1)} MB`;
    }

    const value = maxAttachmentSize / BYTES_IN_KB;
    return value >= 10 ? `${Math.round(value)} KB` : `${value.toFixed(1)} KB`;
  }, [maxAttachmentSize]);

  const handleUploadAttachment = useCallback(
    async (assignment: Assignment) => {
      const taskId = assignment.task?.id;
      if (!taskId) {
        Alert.alert('无法上传附件', '当前任务缺少标识，暂时无法上传附件。');
        return;
      }

      try {
        const picked = await pickAttachment();
        if (!picked) return;

        setUploadingTaskId(taskId);

        const attachment = await uploadAttachment(taskId, picked);

        setAttachmentMap((prev) => {
          const current = prev[taskId] ?? {
            attachments: [],
            loading: false,
            loaded: true,
            error: null,
          };
          return {
            ...prev,
            [taskId]: {
              attachments: [attachment, ...current.attachments],
              loading: false,
              loaded: true,
              error: null,
            },
          };
        });

        Alert.alert('上传成功', '附件已上传成功。');
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件上传失败，请稍后再试。';
        Alert.alert('上传失败', message);
      } finally {
        setUploadingTaskId(null);
      }
    },
    [pickAttachment, uploadAttachment]
  );

  const handleDownloadAttachment = useCallback(
    async (attachment: TaskAttachment) => {
      try {
        setDownloadingAttachmentId(attachment.id);
        const url = await requestDownloadUrl(attachment.filePath);
        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) {
          Alert.alert(
            '无法打开附件',
            '当前设备无法直接打开该附件，请复制链接到浏览器。'
          );
          return;
        }
        await Linking.openURL(url);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件下载失败，请稍后再试。';
        Alert.alert('下载失败', message);
      } finally {
        setDownloadingAttachmentId(null);
      }
    },
    [requestDownloadUrl]
  );

  const handleRefreshAttachments = useCallback(
    async (taskId: string) => {
      try {
        await refreshAttachments(taskId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : '附件刷新失败，请稍后再试。';
        Alert.alert('刷新失败', message);
      }
    },
    [refreshAttachments]
  );

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
    if (assignment.task?.requireAttachment) {
      const taskId = assignment.task.id;
      if (taskId) {
        try {
          const currentState = attachmentMapRef.current[taskId];
          if (!currentState || (!currentState.loaded && !currentState.loading)) {
            await refreshAttachments(taskId);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : '附件加载失败，请稍后再试。';
          Alert.alert('附件加载失败', message);
          return;
        }

        const state = attachmentMapRef.current[taskId];
        const attachmentsForTask = state?.attachments ?? [];
        const ownAttachments =
          currentUserId && currentUserId.length > 0
            ? attachmentsForTask.filter((item) => item.uploadedBy === currentUserId)
            : attachmentsForTask;

        if (ownAttachments.length === 0) {
          Alert.alert('需要附件', '该任务要求提交附件，请先上传后再完成。');
          return;
        }
      }
    }
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
      ? '请确认执行内容，必要时同步给相关管理员。'
      : '说明将同步给管理员，确认无误后提交。';
  const noteLength = noteDraft.trim().length;

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
        <Text style={styles.emptyText}>当前暂无任务</Text>
      ) : (
        assignments.map((assignment) => {
          const updating = isUpdating(assignment.id);
          const taskId = assignment.task?.id ?? null;
          const attachmentsState = taskId ? attachmentMap[taskId] : undefined;
          const attachments = attachmentsState?.attachments ?? [];
          const attachmentsLoading = attachmentsState?.loading ?? false;
          const attachmentsError = attachmentsState?.error ?? null;
          const requireAttachment = assignment.task?.requireAttachment ?? false;
          const ownAttachments =
            taskId && currentUserId
              ? attachments.filter((item) => item.uploadedBy === currentUserId)
              : attachments;
          const hasOwnAttachment = ownAttachments.length > 0;
          const missingRequiredAttachment = requireAttachment && !hasOwnAttachment;
          const uploadingThisTask = taskId !== null && uploadingTaskId === taskId;
          const disableComplete = updating || missingRequiredAttachment;

          return (
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
                分发时间：{formatDateTime(assignment.createdAt)}
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
              <Text style={styles.taskMetaText}>审核状态：</Text>
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
                  disabled={updating}
                  style={({ pressed }) => [
                    styles.actionPrimary,
                    pressed && styles.buttonPressed,
                    updating && styles.buttonDisabled,
                  ]}
                  onPress={() => void handleStart(assignment)}
                >
                  <Text style={styles.actionPrimaryText}>开始执行</Text>
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
                    onPress={() => openModal(assignment, 'complete')}
                  >
                    <Text style={styles.actionPrimaryText}>提交完成</Text>
                  </Pressable>
                  <Pressable
                    disabled={updating}
                    style={({ pressed }) => [
                      styles.actionSecondary,
                      pressed && styles.buttonPressedLight,
                      updating && styles.buttonDisabled,
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
                    disabled={updating}
                    style={({ pressed }) => [
                      styles.actionSecondary,
                      pressed && styles.buttonPressedLight,
                      updating && styles.buttonDisabled,
                    ]}
                    onPress={() => openModal(assignment, 'edit')}
                  >
                    <Text style={styles.actionSecondaryText}>编辑说明</Text>
                  </Pressable>
                  <Pressable
                    disabled={updating}
                    style={({ pressed }) => [
                      styles.actionSecondary,
                      pressed && styles.buttonPressedLight,
                      updating && styles.buttonDisabled,
                    ]}
                    onPress={() => void handleReopen(assignment)}
                  >
                    <Text style={styles.actionSecondaryText}>重新开启</Text>
                  </Pressable>
                </>
              ) : null}

              {assignment.status === 'archived' ? (
                <Pressable
                  disabled={updating}
                  style={({ pressed }) => [
                    styles.actionSecondary,
                    pressed && styles.buttonPressedLight,
                    updating && styles.buttonDisabled,
                  ]}
                  onPress={() => void handleReopen(assignment)}
                >
                  <Text style={styles.actionSecondaryText}>重新开启</Text>
                </Pressable>
              ) : null}
            </View>

            {taskId ? (
              <View style={styles.attachmentSection}>
                <View style={styles.attachmentHeaderRow}>
                  <View style={styles.attachmentTitleRow}>
                    <Text style={styles.attachmentTitle}>任务附件</Text>
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
                  {attachmentsLoading ? (
                    <ActivityIndicator size="small" color="#111827" />
                  ) : null}
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

                {attachmentsError ? (
                  <Text style={styles.attachmentError}>{attachmentsError}</Text>
                ) : null}

                <View style={styles.attachmentList}>
                  {attachments.length > 0 ? (
                    attachments.map((attachment, index) => {
                      const uploaderLabel =
                        attachment.uploadedBy === currentUserId
                          ? '我上传'
                          : attachment.uploadedBy
                          ? '其他成员上传'
                          : '系统生成';
                      return (
                        <Pressable
                          key={attachment.id}
                          style={[
                            styles.attachmentItem,
                            index === 0 && styles.attachmentItemFirst,
                          ]}
                          onPress={() => void handleDownloadAttachment(attachment)}
                        >
                          <View style={styles.attachmentItemRow}>
                            <Text style={styles.attachmentName} numberOfLines={1}>
                              {attachment.fileName}
                            </Text>
                            {downloadingAttachmentId === attachment.id ? (
                              <ActivityIndicator size="small" color="#111827" />
                            ) : (
                              <Text style={styles.attachmentDownloadText}>查看</Text>
                            )}
                          </View>
                          <Text style={styles.attachmentMeta}>
                            {`${formatFileSize(attachment.sizeBytes)} · ${formatDateTime(
                              attachment.uploadedAt
                            )} · ${uploaderLabel}`}
                          </Text>
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.attachmentEmpty}>暂无附件</Text>
                  )}
                </View>

                <View style={styles.attachmentButtonRow}>
                  <Pressable
                    style={[
                      styles.attachmentButton,
                      (uploadingThisTask || assignment.status === 'archived') &&
                        styles.buttonDisabled,
                    ]}
                    onPress={() => void handleUploadAttachment(assignment)}
                    disabled={uploadingThisTask || assignment.status === 'archived'}
                  >
                    {uploadingThisTask ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.attachmentButtonText}>上传附件</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[
                      styles.attachmentRefreshButton,
                      attachmentsLoading && styles.buttonDisabled,
                    ]}
                    onPress={() => void handleRefreshAttachments(taskId)}
                    disabled={attachmentsLoading}
                  >
                    <Text style={styles.attachmentRefreshText}>刷新列表</Text>
                  </Pressable>
                </View>

                <Text style={styles.attachmentHint}>
                  单个附件大小不超过 {maxAttachmentSizeLabel}
                </Text>
              </View>
            ) : null}
          </View>
          );
        })
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






