"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import { createAuthActions, useSupabaseAuthState } from "@project-ark/shared";

import { supabase } from "./src/lib/supabaseClient";
import { styles } from "./src/styles/appStyles";
import { AuthPanel } from "./src/features/auth/AuthPanel";
import { SessionHeader } from "./src/features/auth/SessionHeader";
import { TaskList } from "./src/features/tasks/TaskList";
import { InvitePanel } from "./src/features/invites/InvitePanel";
import { useAssignments } from "./src/features/tasks/useAssignments";
import { useInvites } from "./src/features/invites/useInvites";
import { formatDateTime } from "./src/utils/formatters";
import { usePushToken } from "./src/features/notifications/usePushToken";
import type { AuthMode, AssignmentStatus, TabKey } from "./src/types";

const MESSAGE_MAP = {
  "sign-in-success": "登录成功，欢迎回来",
  "sign-up-confirm-email": "注册成功，请查收邮箱完成验证",
  "sign-up-complete": "注册成功，邮箱已验证，可以直接登录",
  "password-reset-sent": "重置邮件已发送，请检查邮箱",
  "sign-out-success": "您已安全退出",
} as const;

const ERROR_MAP = {
  "credentials-missing": "请输入邮箱和密码",
  "password-reset-email-required": "请输入邮箱以发送重置链接",
  "sign-in-failed": "登录失败，请检查邮箱和密码",
  "sign-up-failed": "注册失败，请稍后再试",
  "password-reset-failed": "重置邮件发送失败，请稍后再试",
  "sign-out-failed": "退出登录失败，请稍后再试",
} as const;

const NAV_ITEMS: Array<{
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isFab?: boolean;
}> = [
  { key: "tasks", label: "任务清单", icon: "checkmark-done-outline" },
  { key: "create", label: "发布", icon: "add", isFab: true },
  { key: "profile", label: "我的", icon: "person-circle-outline" },
];

export default function App() {
  const authState = useSupabaseAuthState({ client: supabase });
  const authActions = useMemo(() => createAuthActions(supabase), []);

  const session = authState.session;

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("tasks");
  const [statusFilter, setStatusFilter] = useState<"all" | AssignmentStatus>("all");

  const {
    assignments,
    loading: assignmentsLoading,
    refreshing,
    error: assignmentsError,
    loadAssignments,
    refreshAssignments,
    updateAssignmentStatus,
    lastSyncedAt,
  } = useAssignments(session);

  const {
    joinRequests,
    loading: joinRequestsLoading,
    error: joinRequestsError,
    loadJoinRequests,
    redeemCode,
    setRedeemCode,
    redeemLoading,
    redeemMessage,
    redeemError,
    redeemInvite,
  } = useInvites(session);

  const { error: pushError } = usePushToken(session);

  const ensureCredentials = () => {
    if (!email || !password) {
      Alert.alert("提示", "请输入邮箱和密码");
      return false;
    }
    return true;
  };

  const resolveMessage = (
    code?: keyof typeof MESSAGE_MAP,
    fallback?: string | null
  ) =>
    code ? MESSAGE_MAP[code] ?? fallback ?? "操作成功" : fallback ?? "操作成功";

  const resolveError = (
    code?: keyof typeof ERROR_MAP,
    fallback?: string | null
  ) =>
    code ? ERROR_MAP[code] ?? fallback ?? "发生未知错误" : fallback ?? "发生未知错误";

  const handleAuth = async () => {
    if (!ensureCredentials()) return;
    setSubmitting(true);
    const credentials = { email, password };
    const result =
      mode === "signIn"
        ? await authActions.signInWithPassword(credentials)
        : await authActions.signUpWithPassword(credentials);

    setSubmitting(false);

    if (result.success) {
      Alert.alert("提示", resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert("操作失败", resolveError(result.errorCode, result.error));
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert("提示", "请输入邮箱以发送重置链接");
      return;
    }
    setSubmitting(true);
    const result = await authActions.resetPassword(email);
    setSubmitting(false);

    if (result.success) {
      Alert.alert("提示", resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert("操作失败", resolveError(result.errorCode, result.error));
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    const result = await authActions.signOut();
    setSubmitting(false);

    if (result.success) {
      setEmail("");
      setPassword("");
      Alert.alert("提示", resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert("操作失败", resolveError(result.errorCode, result.error));
    }
  };

  useEffect(() => {
    if (session?.user) {
      void loadAssignments();
      void loadJoinRequests();
    } else {
      setEmail("");
      setPassword("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  useEffect(() => {
    if (pushError) {
      Alert.alert("通知注册失败", pushError);
    }
  }, [pushError]);

  const refreshControl =
    activeTab === "tasks" ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={refreshAssignments}
        tintColor="#111827"
      />
    ) : undefined;

  const renderTasksTab = (currentSession: Session) => (
    <>
      <SessionHeader
        session={currentSession}
        submitting={submitting}
        onSignOut={handleSignOut}
      />
      {lastSyncedAt ? (
        <Text style={styles.syncHint}>上次同步：{formatDateTime(lastSyncedAt)}</Text>
      ) : null}
      <TaskList
        assignments={assignments}
        formatDateTime={formatDateTime}
        loading={assignmentsLoading}
        error={assignmentsError}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onUpdateStatus={updateAssignmentStatus}
        currentUserId={currentSession.user.id}
      />
    </>
  );

  const renderCreateTab = () => (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>任务发布即将上线</Text>
      <Text style={styles.placeholderText}>
        我们正在规划移动端任务发布与分发能力，请暂时在 Web 端完成操作。
      </Text>
    </View>
  );

  const renderProfileTab = (currentSession: Session) => (
    <>
      <SessionHeader
        session={currentSession}
        submitting={submitting}
        onSignOut={handleSignOut}
      />
      <InvitePanel
        redeemCode={redeemCode}
        setRedeemCode={setRedeemCode}
        redeemLoading={redeemLoading}
        redeemMessage={redeemMessage}
        redeemError={redeemError}
        onRedeem={redeemInvite}
        joinRequests={joinRequests}
        joinRequestsLoading={joinRequestsLoading}
        joinRequestsError={joinRequestsError}
        onRefreshRequests={loadJoinRequests}
        formatDateTime={formatDateTime}
      />
    </>
  );

  const renderContent = () => {
    if (!session) {
      return (
        <View style={styles.panel}>
          <Text style={styles.title}>登录 Project Ark</Text>
          <Text style={styles.subtitle}>
            使用邮箱和密码登录后即可同步组织任务。
          </Text>
          <AuthPanel
            mode={mode}
            setMode={setMode}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            submitting={submitting}
            onAuth={handleAuth}
            onResetPassword={handleResetPassword}
          />
        </View>
      );
    }

    const currentSession = session;

    return (
      <View style={styles.panel}>
        <Text style={styles.title}>移动端任务中心</Text>
        <Text style={styles.subtitle}>
          查看并处理来自不同组织的小组任务与审批。
        </Text>
        {activeTab === "tasks"
          ? renderTasksTab(currentSession)
          : activeTab === "create"
          ? renderCreateTab()
          : renderProfileTab(currentSession)}
      </View>
    );
  };

  const handleNavPress = (key: TabKey) => {
    if (key === "create") {
      setActiveTab("create");
      Alert.alert("功能预告", "移动端任务发布功能即将上线，敬请期待。");
      return;
    }
    setActiveTab(key);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {renderContent()}
          </ScrollView>
        </View>

        {session ? (
          <View style={styles.bottomNavWrapper}>
            <View style={styles.bottomNav}>
              {NAV_ITEMS.map((item) =>
                item.isFab ? (
                  <TouchableOpacity
                    key={item.key}
                    activeOpacity={0.9}
                    style={styles.bottomNavFab}
                    onPress={() => handleNavPress(item.key)}
                  >
                    <Ionicons name={item.icon} size={32} style={styles.bottomNavFabIcon} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.bottomNavItem,
                      activeTab === item.key && styles.bottomNavItemActive,
                    ]}
                    onPress={() => handleNavPress(item.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={item.icon}
                      size={22}
                      style={[
                        styles.bottomNavIcon,
                        activeTab === item.key && styles.bottomNavIconActive,
                      ]}
                    />
                    <Text
                      style={[
                        styles.bottomNavLabel,
                        activeTab === item.key && styles.bottomNavLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
