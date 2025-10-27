import { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

const MESSAGE_MAP: Record<AuthMessageCode, string> = {
  'sign-in-success': '登录成功，欢迎回来',
  'sign-up-confirm-email': '注册成功，请前往邮箱完成验证',
  'sign-up-complete': '注册成功，邮箱已验证，可直接登录',
  'password-reset-sent': '重置邮件已发送，请检查邮箱',
  'sign-out-success': '您已安全退出',
};

const ERROR_MAP: Record<AuthErrorCode, string> = {
  'credentials-missing': '请填写邮箱和密码',
  'password-reset-email-required': '请输入邮箱以发送重置链接',
  'sign-in-failed': '登录失败，请检查邮箱和密码',
  'sign-up-failed': '注册失败，请稍后再试',
  'password-reset-failed': '密码重置发送失败，请稍后再试',
  'sign-out-failed': '退出登录失败，请稍后再试',
};

function resolveMessage(
  code?: AuthMessageCode,
  fallback?: string | null
): string {
  const mapped = code ? MESSAGE_MAP[code] : undefined;
  return mapped ?? fallback ?? '操作成功';
}

function resolveError(code?: AuthErrorCode, fallback?: string | null): string {
  const mapped = code ? ERROR_MAP[code] : undefined;
  return mapped ?? fallback ?? '发生未知错误';
}

export default function App() {
  const authState = useSupabaseAuthState({ client: supabase });
  const authActions = useMemo(() => createAuthActions(supabase), []);

  const session = authState.session;

  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ensureCredentials = useCallback(() => {
    if (!email || !password) {
      Alert.alert('提示', '请填写邮箱和密码');
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
      Alert.alert('提示', '请输入邮箱以发送重置链接');
      return;
    }

    setSubmitting(true);
    const result = await authActions.resetPassword(email);
    setSubmitting(false);

    if (result.success) {
      Alert.alert('成功', resolveMessage(result.messageCode, result.message));
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
      Alert.alert('提示', resolveMessage(result.messageCode, result.message));
    } else {
      Alert.alert('操作失败', resolveError(result.errorCode, result.error));
    }
  }, [authActions]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.caption}>PROJECT ARK</Text>
            <Text style={styles.title}>
              {session ? '欢迎回来' : '登录 Project Ark'}
            </Text>
            <Text style={styles.subtitle}>
              使用邮箱账户访问你的任务中心
            </Text>
          </View>

          <View style={styles.card}>
            {authState.loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#111827" />
                <Text style={styles.loadingText}>正在同步会话状态…</Text>
              </View>
            ) : session ? (
              <View style={styles.sessionContainer}>
                <Text style={styles.sessionLabel}>当前登录</Text>
                <Text style={styles.sessionEmail}>
                  {session.user.email ?? '已认证用户'}
                </Text>
                <Text style={styles.sessionId}>
                  会话 ID：{session.user.id.slice(0, 8)}…
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleSignOut}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>退出登录</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.toggleRow}>
                  <Pressable
                    style={[
                      styles.toggleButton,
                      mode === 'signIn' && styles.toggleButtonActive,
                    ]}
                    onPress={() => setMode('signIn')}
                    disabled={submitting}
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
                    disabled={submitting}
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

                {authState.error ? (
                  <Text style={styles.errorText}>{authState.error}</Text>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>邮箱</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@company.com"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    editable={!submitting}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>密码</Text>
                  <TextInput
                    secureTextEntry
                    placeholder="至少 6 位字符"
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    editable={!submitting}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleAuth}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === 'signIn'
                        ? '登录'
                        : '注册并发送验证邮件'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressedLight,
                  ]}
                  onPress={handleResetPassword}
                  disabled={submitting}
                >
                  <Text style={styles.secondaryButtonText}>
                    忘记密码？重置
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 64,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  caption: {
    fontSize: 12,
    letterSpacing: 4,
    fontWeight: '600',
    color: '#1f2937',
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    shadowColor: '#111827',
    shadowOpacity: 0.07,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 8,
  },
  loadingBox: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  toggleRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    backgroundColor: '#f4f4f5',
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
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
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  primaryButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  buttonPressedLight: {
    backgroundColor: '#f9fafb',
  },
  sessionContainer: {
    gap: 16,
  },
  sessionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6b7280',
    fontWeight: '600',
  },
  sessionEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  sessionId: {
    fontSize: 12,
    color: '#6b7280',
  },
  errorText: {
    marginBottom: 12,
    fontSize: 13,
    color: '#dc2626',
  },
});
