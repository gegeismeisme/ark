import type { Dispatch, SetStateAction } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import type { AuthMode } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

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
            {t('auth.signIn')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, mode === 'signUp' && styles.toggleButtonActive]}
          onPress={() => setMode('signUp')}
        >
          <Text style={[styles.toggleLabel, mode === 'signUp' && styles.toggleLabelActive]}>
            {t('auth.signUp')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('auth.emailLabel')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('auth.emailPlaceholder')}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{t('auth.passwordLabel')}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('auth.passwordPlaceholder')}
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
          <Text style={styles.primaryButtonText}>
            {mode === 'signIn' ? t('auth.submitSignIn') : t('auth.submitSignUp')}
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
          onPress={onResetPassword}
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonText}>{t('auth.forgotPassword')}</Text>
        </Pressable>
      ) : null}
    </>
  );
}
