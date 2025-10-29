'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  createAuthActions,
  useSupabaseAuthState,
  type AuthErrorCode,
  type AuthMessageCode,
} from '@project-ark/shared';

import { supabase } from './src/lib/supabaseClient';

type AuthMode = 'signIn' | 'signUp';
type TabKey = 'tasks' | 'invites';
type AssignmentStatus = 'sent' | 'received' | 'completed' | 'archived';
type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type Assignment = {
  id: string;
  taskId: string;
  status: AssignmentStatus;
  createdAt: string;
  receivedAt: string | null;
  completedAt: string | null;
  task: {
    id: string;
    title: string;
    description: string | null;
    dueAt: string | null;
    groupId: string | null;
    groupName: string | null;
    organizationId: string | null;
    organizationName: string | null;
  } | null;
};

type AssignmentRow = {
  id: string;
  task_id: string;
  status: AssignmentStatus;
  created_at: string;
  received_at: string | null;
  completed_at: string | null;
  tasks: {
    id: string;
    title: string;
    description: string | null;
    due_at: string | null;
    group_id: string | null;
    organization_id: string | null;
    groups:
      | {
          id: string;
          name: string;
        }
      | {
          id: string;
          name: string;
        }[]
      | null;
    organizations:
      | {
          id: string;
          name: string;
        }
      | {
          id: string;
          name: string;
        }[]
      | null;
  } | null;
};

type JoinRequest = {
  id: string;
  organizationId: string;
  organizationName: string | null;
  status: JoinRequestStatus;
  message: string | null;
  createdAt: string;
  reviewedAt: string | null;
  responseNote: string | null;
};

type JoinRequestRow = {
  id: string;
  organization_id: string;
  status: JoinRequestStatus;
  message: string | null;
  created_at: string;
  reviewed_at: string | null;
  response_note: string | null;
  organizations:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

const MESSAGE_MAP: Record<AuthMessageCode, string> = {
  'sign-in-success': 'Signed in successfully',
  'sign-up-confirm-email': 'Sign-up complete, please confirm your email inbox',
  'sign-up-complete': 'Sign-up complete, you may sign in directly',
  'password-reset-sent': 'Password reset e-mail sent',
  'sign-out-success': 'You are signed out',
};

const ERROR_MAP: Record<AuthErrorCode, string> = {
  'credentials-missing': 'Please provide both e-mail and password',
  'password-reset-email-required': 'Please enter an e-mail to send the reset link',
  'sign-in-failed': 'Sign-in failed, please verify your credentials',
  'sign-up-failed': 'Sign-up failed, please try again later',
  'password-reset-failed': 'Reset e-mail failed to send, please retry',
  'sign-out-failed': 'Sign-out failed, please retry',
};

const STATUS_LABELS: Record<AssignmentStatus, string> = {
  sent: 'Waiting',
  received: 'In progress',
  completed: 'Completed',
  archived: 'Archived',
};

const STATUS_OPTIONS: Array<{ value: 'all' | AssignmentStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sent', label: STATUS_LABELS.sent },
  { value: 'received', label: STATUS_LABELS.received },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'archived', label: STATUS_LABELS.archived },
];

const REQUEST_STATUS_LABELS: Record<JoinRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function resolveMessage(
  code?: AuthMessageCode,
  fallback?: string | null
): string {
  const mapped = code ? MESSAGE_MAP[code] : undefined;
  return mapped ?? fallback ?? 'Operation complete';
}

function resolveError(code?: AuthErrorCode, fallback?: string | null): string {
  const mapped = code ? ERROR_MAP[code] : undefined;
  return mapped ?? fallback ?? 'Unexpected error occurred';
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not available';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function App() {
  const authState = useSupabaseAuthState({ client: supabase });
  const authActions = useMemo(() => createAuthActions(supabase), []);

  const session = authState.session;

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>('tasks');
  const [statusFilter, setStatusFilter] = useState<'all' | AssignmentStatus>('all');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsRefreshing, setAssignmentsRefreshing] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);

  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [joinRequestsLoading, setJoinRequestsLoading] = useState(false);
  const [joinRequestsError, setJoinRequestsError] = useState<string | null>(null);

  const [redeemCode, setRedeemCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const ensureCredentials = useCallback(() => {
    if (!email || !password) {
      Alert.alert('提示', '请先填写邮箱和密码');
      return false;
    }
    return true;
  }, [email, password]);

  const handleAuth = useCallback(async () => {
    if (!ensureCredentials()) return;

    setSubmitting(true);
    const credentials = { email, password };
    const result =
      mode === 'signIn'
        ? await authActions.signInWithPassword(credentials)
        : await authActions.signUpWithPassword(credentials);

    setSubmitting(false);

    if (result.success) {
      setPassword('');
      if (mode === 'signUp') {
        setMode('signIn');
      }
      Alert.alert('成功', resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert('操作失败', resolveError(result.errorCode, result.error));
    }
  }, [authActions, email, ensureCredentials, mode, password]);

  const handleResetPassword = useCallback(async () => {
    if (!email) {
      Alert.alert('提示', '请输入邮箱地址以发送重置链接');
      return;
    }

    setSubmitting(true);
    const result = await authActions.resetPassword(email);
    setSubmitting(false);

    if (result.success) {
      Alert.alert('已发送', resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert('操作失败', resolveError(result.errorCode, result.error));
    }
  }, [authActions, email]);

  const handleSignOut = useCallback(async () => {
    setSubmitting(true);
    const result = await authActions.signOut();
    setSubmitting(false);

    if (result.success) {
      setEmail('');
      setPassword('');
      Alert.alert('已退出', resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert('操作失败', resolveError(result.errorCode, result.error));
    }
  }, [authActions]);

  const loadAssignments = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!session?.user) {
        setAssignments([]);
        return;
      }

      if (!options?.silent) {
        setAssignmentsLoading(true);
      }
      setAssignmentsError(null);

      const { data, error } = await supabase
        .from('task_assignments')
        .select(
          `
            id,
            task_id,
            status,
            created_at,
            received_at,
            completed_at,
            tasks (
              id,
              title,
              description,
              due_at,
              group_id,
              organization_id,
              groups ( id, name ),
              organizations ( id, name )
            )
          `
        )
        .eq('assignee_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setAssignments([]);
        setAssignmentsError(error.message);
        setAssignmentsLoading(false);
        setAssignmentsRefreshing(false);
        return;
      }

      const mapped =
        (data ?? []).map((row: AssignmentRow) => {
          const task = row.tasks;
          const groupRaw = task?.groups;
          const organizationRaw = task?.organizations;

          const group =
            Array.isArray(groupRaw) ? groupRaw[0] ?? null : groupRaw ?? null;
          const organization =
            Array.isArray(organizationRaw)
              ? organizationRaw[0] ?? null
              : organizationRaw ?? null;

          return {
            id: row.id,
            taskId: row.task_id,
            status: row.status,
            createdAt: row.created_at,
            receivedAt: row.received_at,
            completedAt: row.completed_at,
            task: task
              ? {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  dueAt: task.due_at,
                  groupId: task.group_id,
                  groupName: group?.name ?? null,
                  organizationId: task.organization_id,
                  organizationName: organization?.name ?? null,
                }
              : null,
          } satisfies Assignment;
        }) ?? [];

      setAssignments(mapped);
      setAssignmentsLoading(false);
      setAssignmentsRefreshing(false);
    },
    [session?.user]
  );

  const loadJoinRequests = useCallback(async () => {
    if (!session?.user) {
      setJoinRequests([]);
      return;
    }

    setJoinRequestsLoading(true);
    setJoinRequestsError(null);

    const { data, error } = await supabase
      .from('organization_join_requests')
      .select(
        `
          id,
          organization_id,
          status,
          message,
          created_at,
          reviewed_at,
          response_note,
          organizations ( id, name )
        `
      )
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setJoinRequests([]);
      setJoinRequestsError(error.message);
      setJoinRequestsLoading(false);
      return;
    }

    const mapped =
      (data ?? []).map((row: JoinRequestRow) => {
        const organizationRaw = row.organizations;
        const organization =
          Array.isArray(organizationRaw)
            ? organizationRaw[0] ?? null
            : organizationRaw ?? null;
        return {
          id: row.id,
          organizationId: row.organization_id,
          organizationName: organization?.name ?? null,
          status: row.status,
          message: row.message,
          createdAt: row.created_at,
          reviewedAt: row.reviewed_at,
          responseNote: row.response_note,
        } satisfies JoinRequest;
      }) ?? [];

    setJoinRequests(mapped);
    setJoinRequestsLoading(false);
  }, [session?.user]);

  const handleRefreshAssignments = useCallback(async () => {
    setAssignmentsRefreshing(true);
    await loadAssignments({ silent: true });
  }, [loadAssignments]);

  const handleUpdateAssignmentStatus = useCallback(
    async (assignmentId: string, nextStatus: AssignmentStatus) => {
      const target = assignments.find((item) => item.id === assignmentId);
      if (!target || target.status === nextStatus) return;

      const updates: Record<string, unknown> = {
        status: nextStatus,
        updated_at: new Date().toISOString(),
      };

      if (nextStatus === 'received') {
        updates.received_at = new Date().toISOString();
        updates.completed_at = null;
      } else if (nextStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
      } else if (nextStatus === 'sent') {
        updates.received_at = null;
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('task_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (error) {
        Alert.alert('更新失败', error.message);
        return;
      }

      setAssignments((prev) =>
        prev.map((item) =>
          item.id === assignmentId
            ? {
                ...item,
                status: nextStatus,
                receivedAt:
                  nextStatus === 'received'
                    ? (updates.received_at as string)
                    : nextStatus === 'sent'
                      ? null
                      : item.receivedAt,
                completedAt:
                  nextStatus === 'completed'
                    ? (updates.completed_at as string)
                    : nextStatus === 'received' || nextStatus === 'sent'
                      ? null
                      : item.completedAt,
              }
            : item
        )
      );
    },
    [assignments]
  );

  const handleRedeemInvite = useCallback(async () => {
    const trimmed = redeemCode.trim();
    if (!trimmed) {
      setRedeemError('请输入有效的邀请码');
      return;
    }

    if (!session?.user) {
      setRedeemError('请先登录后再尝试使用邀请码');
      return;
    }

    setRedeemLoading(true);
    setRedeemError(null);
    setRedeemMessage(null);

    const { data, error } = await supabase.rpc('redeem_org_invite', {
      p_code: trimmed,
    });

    setRedeemLoading(false);

    if (error) {
      setRedeemError(error.message);
      return;
    }

    const organizationId =
      Array.isArray(data) && data.length > 0 ? data[0]?.organization_id ?? null : null;
    setRedeemMessage(
      organizationId
        ? '邀请码使用成功，您已加入对应组织。'
        : '邀请码使用成功。'
    );
    setRedeemCode('');
    void loadAssignments({ silent: true });
    void loadJoinRequests();
  }, [redeemCode, session?.user, loadAssignments, loadJoinRequests]);

  const filteredAssignments = useMemo(() => {
    if (statusFilter === 'all') return assignments;
    return assignments.filter((assignment) => assignment.status === statusFilter);
  }, [assignments, statusFilter]);

  useEffect(() => {
    if (session?.user) {
      void loadAssignments();
      void loadJoinRequests();
    } else {
      setAssignments([]);
      setJoinRequests([]);
    }
  }, [loadAssignments, loadJoinRequests, session?.user]);

  const refreshControl =
    activeTab === 'tasks' ? (
      <RefreshControl
        refreshing={assignmentsRefreshing}
        onRefresh={handleRefreshAssignments}
        tintColor="#111827"
      />
    ) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          <View style={styles.panel}>
            <Text style={styles.title}>
              {session ? '移动端任务中心' : '登录 Project Ark'}
            </Text>
            <Text style={styles.subtitle}>
              {session
                ? '在这里查看待办任务、处理邀请与加入申请。'
                : '使用邮箱与密码登录后即可管理组织任务。'}
            </Text>

            {!session ? (
              <>
                <View style={styles.toggleRow}>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      mode === 'signIn' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setMode('signIn')}
                  >
                    <Text
                      style={[
                        styles.toggleLabel,
                        mode === 'signIn' && styles.toggleLabelActive,
                      ]}
                    >
                      登录
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      mode === 'signUp' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setMode('signUp')}
                  >
                    <Text
                      style={[
                        styles.toggleLabel,
                        mode === 'signUp' && styles.toggleLabelActive,
                      ]}
                    >
                      注册
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>邮箱</Text>
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="name@example.com"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>密码</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="至少六位字符"
                    secureTextEntry
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                    submitting && styles.buttonDisabled,
                  ]}
                  onPress={handleAuth}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === 'signIn' ? '登录' : '注册'}
                    </Text>
                  )}
                </Pressable>

                {mode === 'signIn' ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.buttonPressedLight,
                      submitting && styles.buttonDisabled,
                    ]}
                    onPress={handleResetPassword}
                    disabled={submitting}
                  >
                    <Text style={styles.secondaryButtonText}>忘记密码？</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.sessionBlock}>
                  <View>
                    <Text style={styles.sessionLabel}>当前账号</Text>
                    <Text style={styles.sessionEmail}>
                      {session.user.email ?? '未验证邮箱'}
                    </Text>
                    <Text style={styles.sessionAid}>
                      用户 ID：{session.user.id.slice(0, 8)}…
                    </Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.buttonPressedLight,
                      submitting && styles.buttonDisabled,
                    ]}
                    onPress={handleSignOut}
                    disabled={submitting}
                  >
                    <Text style={styles.secondaryButtonText}>退出登录</Text>
                  </Pressable>
                </View>

                <View style={styles.tabRow}>
                  <Pressable
                    style={[
                      styles.tabButton,
                      activeTab === 'tasks' && styles.tabButtonActive,
                    ]}
                    onPress={() => setActiveTab('tasks')}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        activeTab === 'tasks' && styles.tabLabelActive,
                      ]}
                    >
                      我的任务
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.tabButton,
                      activeTab === 'invites' && styles.tabButtonActive,
                    ]}
                    onPress={() => setActiveTab('invites')}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        activeTab === 'invites' && styles.tabLabelActive,
                      ]}
                    >
                      邀请与申请
                    </Text>
                  </Pressable>
                </View>

                {activeTab === 'tasks' ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>待办任务</Text>
                    <Text style={styles.sectionHint}>
                      选择状态快速筛选，并随手更新完成情况。
                    </Text>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.chipRow}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <Pressable
                          key={option.value}
                          style={[
                            styles.chip,
                            statusFilter === option.value && styles.chipActive,
                          ]}
                          onPress={() =>
                            setStatusFilter(option.value as 'all' | AssignmentStatus)
                          }
                        >
                          <Text
                            style={[
                              styles.chipLabel,
                              statusFilter === option.value && styles.chipLabelActive,
                            ]}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>

                    {assignmentsLoading ? (
                      <View style={styles.loadingBox}>
                        <ActivityIndicator color="#111827" />
                        <Text style={styles.loadingText}>正在加载任务…</Text>
                      </View>
                    ) : assignmentsError ? (
                      <Text style={styles.errorText}>{assignmentsError}</Text>
                    ) : filteredAssignments.length === 0 ? (
                      <Text style={styles.emptyText}>没有找到符合条件的任务。</Text>
                    ) : (
                      filteredAssignments.map((assignment) => (
                        <View key={assignment.id} style={styles.taskCard}>
                          <View style={styles.taskHead}>
                            <Text style={styles.taskTitle}>
                              {assignment.task?.title ?? '未命名任务'}
                            </Text>
                            <Text style={styles.taskBadge}>
                              {STATUS_LABELS[assignment.status]}
                            </Text>
                          </View>
                          {assignment.task?.description ? (
                            <Text style={styles.taskDesc}>
                              {assignment.task.description}
                            </Text>
                          ) : null}
                          <View style={styles.taskMeta}>
                            <Text style={styles.taskMetaText}>
                              下发：{formatDateTime(assignment.createdAt)}
                            </Text>
                            <Text style={styles.taskMetaText}>
                              截止：{formatDateTime(assignment.task?.dueAt ?? null)}
                            </Text>
                          </View>
                          <View style={styles.taskMeta}>
                            <Text style={styles.taskMetaText}>
                              组织：{assignment.task?.organizationName ?? '未知组织'}
                            </Text>
                            <Text style={styles.taskMetaText}>
                              小组：{assignment.task?.groupName ?? '未分组'}
                            </Text>
                          </View>
                          <View style={styles.taskActions}>
                            {assignment.status !== 'completed' ? (
                              <Pressable
                                style={({ pressed }) => [
                                  styles.actionPrimary,
                                  pressed && styles.buttonPressed,
                                ]}
                                onPress={() =>
                                  void handleUpdateAssignmentStatus(
                                    assignment.id,
                                    'completed'
                                  )
                                }
                              >
                                <Text style={styles.actionPrimaryText}>标记完成</Text>
                              </Pressable>
                            ) : (
                              <Pressable
                                style={({ pressed }) => [
                                  styles.actionSecondary,
                                  pressed && styles.buttonPressedLight,
                                ]}
                                onPress={() =>
                                  void handleUpdateAssignmentStatus(
                                    assignment.id,
                                    'received'
                                  )
                                }
                              >
                                <Text style={styles.actionSecondaryText}>
                                  重新打开
                                </Text>
                              </Pressable>
                            )}
                            {assignment.status === 'sent' ? (
                              <Pressable
                                style={({ pressed }) => [
                                  styles.actionSecondary,
                                  pressed && styles.buttonPressedLight,
                                ]}
                                onPress={() =>
                                  void handleUpdateAssignmentStatus(
                                    assignment.id,
                                    'received'
                                  )
                                }
                              >
                                <Text style={styles.actionSecondaryText}>开始执行</Text>
                              </Pressable>
                            ) : null}
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                ) : (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>邀请码与加入申请</Text>
                    <Text style={styles.sectionHint}>
                      输入邀请码即可加入组织，同时掌握申请审核进度。
                    </Text>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>邀请码</Text>
                      <TextInput
                        style={styles.input}
                        value={redeemCode}
                        onChangeText={setRedeemCode}
                        placeholder="粘贴或输入邀请码"
                      />
                    </View>
                    {redeemError ? (
                      <Text style={styles.errorText}>{redeemError}</Text>
                    ) : null}
                    {redeemMessage ? (
                      <Text style={styles.successText}>{redeemMessage}</Text>
                    ) : null}

                    <Pressable
                      style={({ pressed }) => [
                        styles.primaryButton,
                        pressed && styles.buttonPressed,
                        redeemLoading && styles.buttonDisabled,
                      ]}
                      onPress={handleRedeemInvite}
                      disabled={redeemLoading}
                    >
                      {redeemLoading ? (
                        <ActivityIndicator color="#ffffff" />
                      ) : (
                        <Text style={styles.primaryButtonText}>使用邀请码</Text>
                      )}
                    </Pressable>

                    <View style={styles.requestSection}>
                      <View style={styles.requestHead}>
                        <Text style={styles.requestTitle}>我的加入申请</Text>
                        <Pressable
                          style={({ pressed }) => [
                            styles.requestRefresh,
                            pressed && styles.buttonPressedLight,
                          ]}
                          onPress={() => void loadJoinRequests()}
                        >
                          <Text style={styles.requestRefreshText}>刷新</Text>
                        </Pressable>
                      </View>

                      {joinRequestsLoading ? (
                        <View style={styles.loadingBox}>
                          <ActivityIndicator color="#111827" />
                          <Text style={styles.loadingText}>正在加载申请记录…</Text>
                        </View>
                      ) : joinRequestsError ? (
                        <Text style={styles.errorText}>{joinRequestsError}</Text>
                      ) : joinRequests.length === 0 ? (
                        <Text style={styles.emptyText}>暂无加入申请记录。</Text>
                      ) : (
                        joinRequests.map((request) => (
                          <View key={request.id} style={styles.requestCard}>
                            <View style={styles.requestRow}>
                              <Text style={styles.requestOrg}>
                                {request.organizationName ?? '未知组织'}
                              </Text>
                              <Text style={styles.requestStatus}>
                                {REQUEST_STATUS_LABELS[request.status]}
                              </Text>
                            </View>
                            <Text style={styles.requestMeta}>
                              提交时间：{formatDateTime(request.createdAt)}
                            </Text>
                            {request.reviewedAt ? (
                              <Text style={styles.requestMeta}>
                                处理时间：{formatDateTime(request.reviewedAt)}
                              </Text>
                            ) : null}
                            {request.message ? (
                              <Text style={styles.requestNote}>
                                说明：{request.message}
                              </Text>
                            ) : null}
                            {request.responseNote ? (
                              <Text style={styles.requestNote}>
                                管理员备注：{request.responseNote}
                              </Text>
                            ) : null}
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f5',
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  panel: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 32,
    elevation: 6,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  toggleLabelActive: {
    color: '#111827',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonPressedLight: {
    backgroundColor: '#f9fafb',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  sessionBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLabel: {
    fontSize: 12,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sessionEmail: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sessionAid: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f4f4f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sectionHint: {
    fontSize: 13,
    color: '#6b7280',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  chipLabelActive: {
    color: '#ffffff',
  },
  loadingBox: {
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
  },
  successText: {
    fontSize: 13,
    color: '#047857',
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280',
  },
  taskCard: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#f9fafb',
    gap: 10,
  },
  taskHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  taskBadge: {
    fontSize: 12,
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  taskDesc: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskMetaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionPrimary: {
    flexGrow: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionSecondary: {
    flexGrow: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionSecondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  requestSection: {
    gap: 12,
  },
  requestHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  requestRefresh: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  requestRefreshText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    gap: 6,
  },
  requestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestOrg: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  requestStatus: {
    fontSize: 12,
    color: '#2563eb',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requestMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  requestNote: {
    fontSize: 13,
    color: '#4b5563',
  },
});
