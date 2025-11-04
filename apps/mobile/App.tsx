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
import { SessionHeader } from "./src/features/auth/SessionHeader";
import { TaskList } from "./src/features/tasks/TaskList";
import { InvitePanel } from "./src/features/invites/InvitePanel";
import { useAssignments } from "./src/features/tasks/useAssignments";
import { useInvites } from "./src/features/invites/useInvites";
import { formatDateTime } from "./src/utils/formatters";
import { usePushToken } from "./src/features/notifications/usePushToken";
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
  { key: "create", labelKey: "nav.create", icon: "add", isFab: true },
  { key: "profile", labelKey: "nav.profile", icon: "person-circle-outline" },
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
      <SessionHeader
        session={currentSession}
        signOutLoading={signOutLoading}
        onSignOut={handleSignOut}
        lastSyncedAt={lastSyncedAt}
        onReload={refreshAssignments}
        syncing={assignmentsLoading}
      />
      <TaskList
        assignments={assignments}
        formatDateTime={formatDateTime}
        loading={assignmentsLoading}
        error={assignmentsError}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onUpdateStatus={updateAssignmentStatus}
        currentUserId={currentSession.user?.id ?? null}
      />
    </>
  );

  const renderCreateTab = () => (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>{t("app.create.placeholderTitle")}</Text>
      <Text style={styles.placeholderText}>{t("app.create.placeholderBody")}</Text>
    </View>
  );

  const renderProfileTab = () => (
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
  );

  const renderContent = () => {
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
        {activeTab === "tasks"
          ? renderTasksTab(session)
          : activeTab === "create"
          ? renderCreateTab()
          : renderProfileTab()}
      </View>
    );
  };

  const handleNavPress = (key: TabKey) => {
    if (key === "create") {
      setActiveTab("create");
      Alert.alert(t("app.alert.featurePreviewTitle"), t("app.alert.featurePreviewBody"));
      return;
    }
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






