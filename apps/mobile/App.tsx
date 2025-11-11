"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import { createAuthActions, useSupabaseAuthState } from "@project-ark/shared";

import { supabase } from "./src/lib/supabaseClient";
import { getExpoExtras, getExtraString } from "./src/lib/runtimeConfig";
import { setLocale, t } from "./src/i18n";
import { styles } from "./src/styles/appStyles";
import { AuthPanel } from "./src/features/auth/AuthPanel";
import { StatusToast } from "./src/components/StatusToast";
import { SessionHeader } from "./src/features/auth/SessionHeader";
import { TaskList } from "./src/features/tasks/TaskList";
import { InvitePanel } from "./src/features/invites/InvitePanel";
import { useAssignments } from "./src/features/tasks/useAssignments";
import { useOfflineQueue } from "./src/features/tasks/hooks/useOfflineQueue";
import { useInvites } from "./src/features/invites/useInvites";
import { formatDateTime } from "./src/utils/formatters";
import { usePushToken } from "./src/features/notifications/usePushToken";
import { PublishForm } from "./src/features/publish/PublishForm";
import { InsightsPanel } from "./src/features/insights/InsightsPanel";
import { useActiveOrganization } from "./src/features/organizations/useActiveOrganization";
import type { AuthMode, AssignmentStatus, TabKey } from "./src/types";

getExpoExtras();

const localeCandidates = [
  typeof process.env.EXPO_PUBLIC_LOCALE === "string" ? process.env.EXPO_PUBLIC_LOCALE : "",
  getExtraString("locale"),
  getExtraString("defaultLocale"),
  getExtraString("language"),
  getExtraString("appLocale"),
];

const normalizedLocale =
  localeCandidates
    .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
    .find((value) => value.length > 0) ?? "";

if (normalizedLocale.startsWith("zh")) {
  setLocale("zh");
} else {
  setLocale("en");
}

const MESSAGE_KEY_MAP: Record<string, string> = {
  "sign-in-success": "app.message.signInSuccess",
  "sign-up-confirm-email": "app.message.signUpVerifyEmail",
  "sign-up-complete": "app.message.signUpComplete",
  "password-reset-sent": "app.message.passwordResetSent",
  "sign-out-success": "app.message.signOutSuccess",
};

const ERROR_KEY_MAP: Record<string, string> = {
  "credentials-missing": "app.error.credentialsMissing",
  "password-reset-email-required": "app.error.passwordResetEmailRequired",
  "sign-in-failed": "app.error.signInFailed",
  "sign-up-failed": "app.error.signUpFailed",
  "password-reset-failed": "app.error.passwordResetFailed",
  "sign-out-failed": "app.error.signOutFailed",
};

const NAV_ITEMS: Array<{
  key: TabKey;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  isFab?: boolean;
}> = [
  { key: "tasks", labelKey: "nav.tasks", icon: "checkmark-done-outline" },
  { key: "publish", labelKey: "nav.publish", icon: "sparkles-outline", isFab: true },
  { key: "insights", labelKey: "nav.insights", icon: "bar-chart-outline" },
  { key: "account", labelKey: "nav.account", icon: "person-circle-outline" },
];

function AppContent() {
  const insets = useSafeAreaInsets();
  const authState = useSupabaseAuthState({ client: supabase });
  const authActions = useMemo(() => createAuthActions(supabase), []);

  const session = authState.session;

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

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
  const offlineQueue = useOfflineQueue(session);
  const renderStatusToast = () => {
    if (!session) return null;
    if (!offlineQueue.pendingCount) return null;
    return (
      <StatusToast
        icon={offlineQueue.processing ? "🔄" : "📡"}
        tone="warning"
        message={t("app.toast.pendingUploads", { count: offlineQueue.pendingCount })}
        actionLabel={
          offlineQueue.processing ? undefined : t("app.toast.retry")
        }
        onActionPress={
          offlineQueue.processing ? undefined : () => void offlineQueue.flushQueue()
        }
      />
    );
  };

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
  const {
    organization,
    loading: orgLoading,
    error: orgError,
    refresh: refreshOrg,
  } = useActiveOrganization(session);

  const ensureCredentials = () => {
    if (!email || !password) {
      Alert.alert(t("app.alert.noticeTitle"), t("app.error.credentialsMissing"));
      return false;
    }
    return true;
  };

  const resolveMessage = (
    code?: string | null,
    fallback?: string | null
  ) =>
    code && MESSAGE_KEY_MAP[code]
      ? t(MESSAGE_KEY_MAP[code])
      : fallback ?? t("app.alert.genericSuccess");

  const resolveError = (
    code?: string | null,
    fallback?: string | null
  ) =>
    code && ERROR_KEY_MAP[code]
      ? t(ERROR_KEY_MAP[code])
      : fallback ?? t("app.alert.genericError");

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
      Alert.alert(t("app.alert.noticeTitle"), resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert(t("app.alert.noticeTitle"), resolveError(result.errorCode, result.error));
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert(
        t("app.alert.noticeTitle"),
        t("app.error.passwordResetEmailRequired")
      );
      return;
    }
    const result = await authActions.resetPassword(email);
    if (result.success) {
      Alert.alert(t("app.alert.noticeTitle"), resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert(t("app.alert.noticeTitle"), resolveError(result.errorCode, result.error));
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    const result = await authActions.signOut();
    setSignOutLoading(false);
    if (!result.success) {
      Alert.alert(t("app.alert.noticeTitle"), resolveError(result.errorCode, result.error));
    }
  };

  useEffect(() => {
    if (session) {
      void loadAssignments();
      void loadJoinRequests();
    }
  }, [session, loadAssignments, loadJoinRequests]);

  useEffect(() => {
    if (pushError) {
      Alert.alert(t("app.alert.pushTitle"), pushError);
    }
  }, [pushError]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={refreshAssignments} />
  );

  const renderTasksTab = (currentSession: Session) => (
    <>
      {orgLoading ? (
        <Text style={styles.syncHint}>{t("app.org.loading")}</Text>
      ) : orgError ? (
        <Text style={styles.errorText}>{t("app.org.error", { error: orgError })}</Text>
      ) : organization ? (
        <Text style={styles.syncHint}>
          {t("app.org.activeLabel", { name: organization.name })}
        </Text>
      ) : null}
      {offlineQueue.pendingCount ? (
        <View style={[styles.reminderCard, styles.reminderCardInfo]}>
          <View style={styles.reminderActionRow}>
            <Text style={styles.reminderText}>
              {offlineQueue.processing
                ? t("task.queue.processing")
                : t("task.queue.pendingBanner", { count: offlineQueue.pendingCount })}
            </Text>
            {!offlineQueue.processing ? (
              <TouchableOpacity
                style={styles.reminderActionButton}
                onPress={() => void offlineQueue.flushQueue()}
              >
                <Text style={styles.reminderActionButtonText}>
                  {t("task.queue.retry")}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}
      <TaskList
        assignments={assignments}
        formatDateTime={formatDateTime}
        loading={assignmentsLoading}
        error={assignmentsError}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onUpdateStatus={updateAssignmentStatus}
        currentUserId={currentSession.user?.id ?? null}
        pendingAssignmentIds={offlineQueue.pendingAssignmentIds}
      />
    </>
  );

  const renderPublishTab = () => (
    <View style={styles.panel}>
      <PublishForm
        session={session}
        organization={organization}
        onSuccess={async () => {
          await refreshAssignments();
          await refreshOrg();
        }}
      />
    </View>
  );

  const renderInsightsTab = () => (
    <View style={styles.section}>
      <InsightsPanel
        assignments={assignments}
        organization={organization}
        lastSyncedAt={lastSyncedAt}
        formatDateTime={formatDateTime}
      />
    </View>
  );

  const renderAccountTab = (currentSession: Session) => (
    <View style={styles.panel}>
      <SessionHeader
        session={currentSession}
        signOutLoading={signOutLoading}
        onSignOut={handleSignOut}
        lastSyncedAt={lastSyncedAt}
        onReload={refreshAssignments}
        syncing={assignmentsLoading}
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
    </View>
  );

  const renderContent = () => {
    const statusToast = renderStatusToast();
    if (!session) {
      return (
        <View style={styles.panel}>
          <Text style={styles.title}>{t("app.login.title")}</Text>
          <Text style={styles.subtitle}>{t("app.login.subtitle")}</Text>
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

    return (
      <View style={styles.panel}>
        <Text style={styles.title}>{t("app.home.title")}</Text>
        <Text style={styles.subtitle}>{t("app.home.subtitle")}</Text>
        {statusToast}
        {activeTab === "tasks"
          ? renderTasksTab(session)
          : activeTab === "publish"
          ? renderPublishTab()
          : activeTab === "insights"
          ? renderInsightsTab()
          : renderAccountTab(session)}
      </View>
    );
  };

  const handleNavPress = (key: TabKey) => {
    setActiveTab(key);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: insets.bottom + 160 },
            ]}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {renderContent()}
          </ScrollView>
        </View>

        {session ? (
          <View
            style={[
              styles.bottomNavWrapper,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
          >
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
                <View style={styles.bottomNavIconWrapper}>
                  <Ionicons
                    name={item.icon}
                    size={22}
                    style={[
                      styles.bottomNavIcon,
                      activeTab === item.key && styles.bottomNavIconActive,
                    ]}
                  />
                  {offlineQueue.pendingCount > 0 && (item.key === "tasks" || item.key === "publish") ? (
                    <View style={styles.bottomNavBadge}>
                      <Text style={styles.bottomNavBadgeText}>
                        {offlineQueue.pendingCount > 99
                          ? "99+"
                          : offlineQueue.pendingCount.toString()}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.bottomNavLabel,
                    activeTab === item.key && styles.bottomNavLabelActive,
                      ]}
                    >
                      {t(item.labelKey)}
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

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}






