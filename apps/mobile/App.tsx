"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { Session } from "@supabase/supabase-js";
import { createAuthActions, useSupabaseAuthState } from "@project-ark/shared";

import { supabase } from "./src/lib/supabaseClient";
import { getExpoExtras, getExtraString } from "./src/lib/runtimeConfig";
import { setLocale, t } from "./src/i18n";
import { styles } from "./src/styles/appStyles";
import { AuthHero } from "./src/features/auth/AuthHero";
import { AuthFormCard } from "./src/features/auth/AuthFormCard";
import { AuthSocialProviders } from "./src/features/auth/AuthSocialProviders";
import { StatusToast } from "./src/components/StatusToast";
import { InvitePanel } from "./src/features/invites/InvitePanel";
import { useAssignments } from "./src/features/tasks/useAssignments";
import { useOfflineQueue } from "./src/features/tasks/hooks/useOfflineQueue";
import { usePendingAttachmentSummary } from "./src/features/tasks/hooks/usePendingAttachmentSummary";
import { useInvites } from "./src/features/invites/useInvites";
import { formatDateTime } from "./src/utils/formatters";
import { usePushToken } from "./src/features/notifications/usePushToken";
import { PublishForm } from "./src/features/publish/PublishForm";
import { InsightsPanel } from "./src/features/insights/InsightsPanel";
import { useActiveOrganization } from "./src/features/organizations/useActiveOrganization";
import { useOrganizationMembers } from "./src/features/organizations/useOrganizationMembers";
import { useProfile } from "./src/features/profile/useProfile";
import { HomeHeader } from "./src/features/home/HomeHeader";
import { HomeSummaryCards, type SummaryStat } from "./src/features/home/HomeSummaryCards";
import { HomeTaskList } from "./src/features/home/HomeTaskList";
import { AccountScreen, type AccountSectionKey } from "./src/features/account/AccountScreen";
import type { AuthMode, Assignment, TabKey } from "./src/types";

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
}> = [
  { key: "tasks", labelKey: "nav.tasks", icon: "checkmark-done-outline" },
  { key: "contacts", labelKey: "nav.contacts", icon: "people-outline" },
  { key: "discover", labelKey: "nav.discover", icon: "compass-outline" },
  { key: "account", labelKey: "nav.account", icon: "person-circle-outline" },
];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

function AppContent() {
  const insets = useSafeAreaInsets();
  const authState = useSupabaseAuthState({ client: supabase });
  const authActions = useMemo(() => createAuthActions(supabase), []);

  const session = authState.session;
  const { profile, updateName } = useProfile(session);

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [accountFocusSection, setAccountFocusSection] = useState<AccountSectionKey | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("tasks");
  const displayName =
    profile?.fullName ??
    session?.user?.email?.split("@")[0] ??
    t("home.greetingFallback");

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
    organization,
    loading: orgLoading,
    error: orgError,
    refresh: refreshOrg,
  } = useActiveOrganization(session);
  const membersResult = useOrganizationMembers(organization?.id ?? null);
  const assignmentStats = useMemo(() => computeAssignmentStats(assignments), [assignments]);

  useEffect(() => {
    setActionMenuVisible(false);
  }, [activeTab]);
  const offlineQueue = useOfflineQueue(session);
  const attachmentSummary = usePendingAttachmentSummary();
  const pendingNavCount = offlineQueue.pendingCount + attachmentSummary.total;
  const renderStatusToast = () => {
    if (!session) return null;

    if (offlineQueue.lastError) {
      return (
        <StatusToast
          icon="??"
          tone="danger"
          message={t("app.toast.syncFailed")}
          actionLabel={t("app.toast.retry")}
          onActionPress={() => void offlineQueue.flushQueue()}
        />
      );
    }

    if (attachmentSummary.errorCount > 0) {
      const attachmentMessage =
        attachmentSummary.lastError ??
        t("app.toast.attachmentsFailed", { count: attachmentSummary.errorCount });
      return (
        <StatusToast
          icon="??"
          tone="danger"
          message={attachmentMessage}
          actionLabel={t("app.toast.openTasks")}
          onActionPress={() => setActiveTab("tasks")}
        />
      );
    }

    if (offlineQueue.processing && offlineQueue.pendingCount > 0) {
      return (
        <StatusToast
          icon="?"
          tone="info"
          message={t("app.toast.syncing", { count: offlineQueue.pendingCount })}
        />
      );
    }

    if (offlineQueue.pendingCount > 0) {
      return (
        <StatusToast
          icon="??"
          tone="warning"
          message={t("app.toast.pendingUploads", { count: offlineQueue.pendingCount })}
          actionLabel={t("app.toast.retry")}
          onActionPress={() => void offlineQueue.flushQueue()}
        />
      );
    }

    if (attachmentSummary.total > 0) {
      return (
        <StatusToast
          icon="??"
          tone="info"
          message={t("app.toast.pendingAttachments", { count: attachmentSummary.total })}
          actionLabel={t("app.toast.openTasks")}
          onActionPress={() => setActiveTab("tasks")}
        />
      );
    }

    return null;
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
  const ensureCredentials = () => {
    if (!email || !password) {
      Alert.alert(t("app.alert.noticeTitle"), t("app.error.credentialsMissing"));
      return false;
    }
    if (mode === "signUp") {
      if (!confirmPassword) {
        Alert.alert(t("app.alert.noticeTitle"), t("auth.confirmPasswordRequired"));
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert(t("app.alert.noticeTitle"), t("app.error.passwordMismatch"));
        return false;
      }
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
      if (mode === "signUp") {
        Alert.alert(t("app.alert.noticeTitle"), t("auth.signUpCheckEmail"));
        setMode("signIn");
        setConfirmPassword("");
      } else {
        Alert.alert(t("app.alert.noticeTitle"), resolveMessage(result.messageCode, result.message));
      }
    } else {
      const baseError = resolveError(result.errorCode, result.error);
      const message =
        mode === "signIn"
          ? `${baseError}\n\n${t("auth.signInHelp")}`
          : baseError;
      Alert.alert(t("app.alert.noticeTitle"), message);
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

  const handleCreateOrganization = useCallback(
    async ({
      name,
      description,
      displayName: memberDisplayName,
    }: {
      name: string;
      description: string;
      displayName: string;
    }) => {
      if (!session?.user?.id || creatingOrganization) return false;
      const trimmedName = name.trim();
      if (!trimmedName) {
        Alert.alert(t("app.alert.noticeTitle"), t("account.organization.errorMissing"));
        return false;
      }
      setCreatingOrganization(true);
      try {
        const slug = slugify(trimmedName);
        const { data, error: rpcError } = await supabase.rpc("bootstrap_organization", {
          p_name: trimmedName,
          p_slug: slug,
          p_owner: session.user.id,
        });

        if (rpcError) {
          Alert.alert(t("app.alert.noticeTitle"), rpcError.message ?? t("app.alert.genericError"));
          return false;
        }

        const orgId = data?.[0]?.organization_id ?? null;
        if (!orgId) {
          Alert.alert(t("app.alert.noticeTitle"), t("app.alert.genericError"));
          return false;
        }

        const trimmedDisplayName = memberDisplayName.trim();
        if (trimmedDisplayName.length > 0) {
          await supabase
            .from("organization_members")
            .update({ display_name: trimmedDisplayName })
            .eq("organization_id", orgId)
            .eq("user_id", session.user.id);
        }

        await refreshOrg();
        Alert.alert(t("account.organization.createdTitle"), t("account.organization.createdMessage"));
        return true;
      } catch (err) {
        Alert.alert(
          t("app.alert.noticeTitle"),
          err instanceof Error ? err.message : t("app.alert.genericError")
        );
        return false;
      } finally {
        setCreatingOrganization(false);
      }
    },
    [creatingOrganization, refreshOrg, session?.user?.id, t]
  );

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
    if (mode === "signIn") {
      setConfirmPassword("");
    }
  }, [mode]);

  useEffect(() => {
    if (pushError) {
      Alert.alert(t("app.alert.pushTitle"), pushError);
    }
  }, [pushError]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={refreshAssignments} />
  );

  const renderTasksTab = (currentSession: Session, statusToast: ReactNode) => {
    const cards: SummaryStat[] = [
      {
        key: "today",
        label: t("home.cards.today"),
        value: assignmentStats.today,
        accent: "#dbeafe",
        icon: "??",
      },
      {
        key: "scheduled",
        label: t("home.cards.scheduled"),
        value: assignmentStats.scheduled,
        accent: "#fef9c3",
        icon: "??",
      },
      {
        key: "all",
        label: t("home.cards.all"),
        value: assignmentStats.all,
        accent: "#ccfbf1",
        icon: "??",
      },
      {
        key: "overdue",
        label: t("home.cards.overdue"),
        value: assignmentStats.overdue,
        accent: "#fde1f3",
        icon: "?",
      },
    ];

    return (
      <View style={styles.homeScreen}>
        <HomeHeader
          name={displayName}
          subtitle={t("home.greetingSubtitle")}
          onPressProfile={() => setActiveTab("account")}
        />
        {statusToast}
        <HomeSummaryCards stats={cards} />
        {orgLoading ? (
          <Text style={styles.homeOrgHint}>{t("app.org.loading")}</Text>
        ) : orgError ? (
          <Text style={styles.errorText}>{t("app.org.error", { error: orgError })}</Text>
        ) : organization ? (
          <Text style={styles.homeOrgHint}>
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

        <Text style={styles.homeSectionTitle}>{t("home.section.today")}</Text>
        <HomeTaskList assignments={assignments} />

        <TouchableOpacity
          style={styles.homeFab}
          activeOpacity={0.85}
          onPress={() => setActiveTab("publish")}
          accessibilityRole="button"
          accessibilityLabel={t("home.actions.create")}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>
    );
  };

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
      <AccountScreen
        profile={profile}
        session={currentSession}
        onUpdateName={updateName}
        onSignOut={handleSignOut}
        signOutLoading={signOutLoading}
        organization={organization}
        onCreateOrganization={handleCreateOrganization}
        creatingOrganization={creatingOrganization}
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

  const renderAuthScreen = () => (
    <View style={styles.authShell}>
      <AuthHero mode={mode} />
      <AuthFormCard
        mode={mode}
        setMode={setMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        submitting={submitting}
        onAuth={handleAuth}
        onResetPassword={handleResetPassword}
      />
      <AuthSocialProviders />
    </View>
  );

  const renderHomeContent = () => {
    const statusToast = renderStatusToast();
    if (activeTab === "tasks") {
      return renderTasksTab(session!, statusToast);
    }
    if (activeTab === "publish") {
      return renderPublishTab();
    }
    if (activeTab === "insights") {
      return renderInsightsTab();
    }
    return renderAccountTab(session!);
  };

  const handleNavPress = (key: TabKey) => {
    setActiveTab(key);
  };

  if (!session) {
    return (
      <SafeAreaView
        style={[
          styles.authSafeArea,
          { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) },
        ]}
      >
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.authScreen}>{renderAuthScreen()}</View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

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
            {renderHomeContent()}
          </ScrollView>
        </View>

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
                    {pendingNavCount > 0 &&
                    (item.key === "tasks" || item.key === "publish") ? (
                      <View style={styles.bottomNavBadge}>
                        <Text style={styles.bottomNavBadgeText}>
                          {pendingNavCount > 99 ? "99+" : pendingNavCount.toString()}
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

type AssignmentStats = {
  today: number;
  scheduled: number;
  overdue: number;
  all: number;
};

const computeAssignmentStats = (assignments: Assignment[]): AssignmentStats => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  let today = 0;
  let scheduled = 0;
  let overdue = 0;

  assignments.forEach((assignment) => {
    const dueAt = assignment.task?.dueAt;
    if (!dueAt) return;
    const dueTime = Date.parse(dueAt);
    if (Number.isNaN(dueTime)) return;
    if (dueTime < startOfToday.getTime()) {
      overdue += 1;
    } else if (dueTime <= endOfToday.getTime()) {
      today += 1;
    } else {
      scheduled += 1;
    }
  });

  return {
    today,
    scheduled,
    overdue,
    all: assignments.length,
  };
};
