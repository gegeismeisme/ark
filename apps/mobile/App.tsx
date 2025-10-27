import { useCallback, useEffect, useState } from 'react';
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
import type { Session } from '@supabase/supabase-js';

import { supabase } from './src/lib/supabaseClient';

type AuthMode = 'signIn' | 'signUp';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const showError = useCallback((title: string, description: string) => {
    Alert.alert(title, description);
  }, []);

  const handleAuth = useCallback(
    async (nextMode: AuthMode) => {
      if (!email || !password) {
        showError('提示', '请填写邮箱和密码');
        return;
      }

      setLoading(true);
      try {
        if (nextMode === 'signIn') {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
          Alert.alert('登录成功', '欢迎回来');
        } else {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          if (data.user?.email_confirmed_at) {
            Alert.alert('注册成功', '邮箱已确认，可以直接登录');
          } else {
            Alert.alert('注册成功', '请前往邮箱完成确认');
          }
          setMode('signIn');
        }
      } catch (err) {
        const description = err instanceof Error ? err.message : '发生未知错误';
        showError('操作失败', description);
      } finally {
        setLoading(false);
      }
    },
    [email, password, showError]
  );

  const handleResetPassword = useCallback(async () => {
    if (!email) {
      showError('提示', '请输入邮箱以发送重置链接');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('已发送', '请在邮箱中完成密码重置操作');
    } catch (err) {
      const description = err instanceof Error ? err.message : '发送失败';
      showError('操作失败', description);
    } finally {
      setLoading(false);
    }
  }, [email, showError]);

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      Alert.alert('已退出', '期待再次见到你');
      setEmail('');
      setPassword('');
    } catch (err) {
      const description = err instanceof Error ? err.message : '退出失败';
      showError('操作失败', description);
    } finally {
      setLoading(false);
    }
  }, [showError]);

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
            <Text style={styles.subtitle}>使用邮箱账户访问你的任务中心</Text>
          </View>

          <View style={styles.card}>
            {session ? (
              <View style={styles.sessionContainer}>
                <Text style={styles.sessionLabel}>当前登录</Text>
                <Text style={styles.sessionEmail}>
                  {session.user.email ?? '已认证用户'}
                </Text>
                <View style={styles.sessionFooter}>
                  <Text style={styles.sessionId}>
                    会话 ID：{session.user.id.slice(0, 8)}…
                  </Text>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={handleSignOut}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>退出登录</Text>
                    )}
                  </Pressable>
                </View>
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
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@company.com"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
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
                    editable={!loading}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => handleAuth(mode)}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === 'signIn' ? '登录' : '注册并发送验证邮件'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressedLight,
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <Text style={styles.secondaryButtonText}>忘记密码？重置</Text>
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
  sessionFooter: {
    gap: 12,
  },
  sessionId: {
    fontSize: 12,
    color: '#6b7280',
  },
});
