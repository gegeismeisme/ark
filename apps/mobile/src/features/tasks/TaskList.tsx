import { ScrollView, Pressable, Text, View } from 'react-native';

import { STATUS_LABELS, STATUS_OPTIONS } from '../../constants';
import type { Assignment, AssignmentStatus } from '../../types';
import { styles } from '../../styles/appStyles';

type TaskListProps = {
  assignments: Assignment[];
  formatDateTime: (value: string | null) => string;
  loading: boolean;
  error: string | null;
  statusFilter: 'all' | AssignmentStatus;
  onStatusFilterChange: (value: 'all' | AssignmentStatus) => void;
  onUpdateStatus: (assignmentId: string, nextStatus: AssignmentStatus) => void;
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
  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <Text style={styles.loadingText}>正在加载任务…</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>待办任务</Text>
      <Text style={styles.sectionHint}>按状态筛选任务，随时更新执行进度。</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {STATUS_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.chip, statusFilter === option.value && styles.chipActive]}
            onPress={() => onStatusFilterChange(option.value)}
          >
            <Text style={[styles.chipLabel, statusFilter === option.value && styles.chipLabelActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {assignments.length === 0 ? (
        <Text style={styles.emptyText}>暂无符合条件的任务。</Text>
      ) : (
        assignments.map((assignment) => (
          <View key={assignment.id} style={styles.taskCard}>
            <View style={styles.taskHead}>
              <Text style={styles.taskTitle}>{assignment.task?.title ?? '未命名任务'}</Text>
              <Text style={styles.taskBadge}>{STATUS_LABELS[assignment.status]}</Text>
            </View>
            {assignment.task?.description ? (
              <Text style={styles.taskDesc}>{assignment.task.description}</Text>
            ) : null}
            <View style={styles.taskMeta}>
              <Text style={styles.taskMetaText}>下发：{formatDateTime(assignment.createdAt)}</Text>
              <Text style={styles.taskMetaText}>
                截止：{formatDateTime(assignment.task?.dueAt ?? null)}
              </Text>
            </View>
            <View style={styles.taskMeta}>
              <Text style={styles.taskMetaText}>
                组织：{assignment.task?.organizationName ?? '未知组织'}
              </Text>
              <Text style={styles.taskMetaText}>小组：{assignment.task?.groupName ?? '未分组'}</Text>
            </View>
            <View style={styles.taskActions}>
              {assignment.status !== 'completed' ? (
                <Pressable
                  style={({ pressed }) => [styles.actionPrimary, pressed && styles.buttonPressed]}
                  onPress={() => onUpdateStatus(assignment.id, 'completed')}
                >
                  <Text style={styles.actionPrimaryText}>标记完成</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.actionSecondary, pressed && styles.buttonPressedLight]}
                  onPress={() => onUpdateStatus(assignment.id, 'received')}
                >
                  <Text style={styles.actionSecondaryText}>重新打开</Text>
                </Pressable>
              )}
              {assignment.status === 'sent' ? (
                <Pressable
                  style={({ pressed }) => [styles.actionSecondary, pressed && styles.buttonPressedLight]}
                  onPress={() => onUpdateStatus(assignment.id, 'received')}
                >
                  <Text style={styles.actionSecondaryText}>开始执行</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
