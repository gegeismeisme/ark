import type { Dispatch, SetStateAction } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import type { AuthMode } from '../../types';
import { styles } from '../../styles/appStyles';

type AuthPanelProps = {
  mode: AuthMode;
  setMode: Dispatch<SetStateAction<AuthMode>>;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  submitting: boolean;
  onAuth: () => void;
  onResetPassword: () => void;
};

export function AuthPanel({
  mode,
  setMode,
  email,
  setEmail,
  password,
  setPassword,
  submitting,
  onAuth,
  onResetPassword,
}: AuthPanelProps) {
  return (
    <>
      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, mode === 'signIn' && styles.toggleButtonActive]}
          onPress={() => setMode('signIn')}
        >
          <Text style={[styles.toggleLabel, mode === 'signIn' && styles.toggleLabelActive]}>
            登录
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, mode === 'signUp' && styles.toggleButtonActive]}
          onPress={() => setMode('signUp')}
        >
          <Text style={[styles.toggleLabel, mode === 'signUp' && styles.toggleLabelActive]}>
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
          secureTextEntry
          placeholder="至少六位字符"
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
          submitting && styles.buttonDisabled,
        ]}
        onPress={onAuth}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>{mode === 'signIn' ? '登录' : '注册'}</Text>
        )}
      </Pressable>

      {mode === 'signIn' ? (
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressedLight,
            submitting && styles.buttonDisabled,
          ]}
          onPress={onResetPassword}
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonText}>忘记密码？</Text>
        </Pressable>
      ) : null}
    </>
  );
}
