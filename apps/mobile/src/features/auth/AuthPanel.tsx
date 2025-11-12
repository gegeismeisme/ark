import type { Dispatch, SetStateAction } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import type { AuthMode } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

export type AuthPanelProps = {
  mode: AuthMode;
  email: string;
  setEmail: Dispatch<SetStateAction<string>>;
  password: string;
  setPassword: Dispatch<SetStateAction<string>>;
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
  submitting: boolean;
  onAuth: () => void;
  onResetPassword: () => void;
};

export function AuthPanel({
  mode,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  submitting,
  onAuth,
  onResetPassword,
}: AuthPanelProps) {
  return (
    <View style={styles.authPanelStack}>
      <View style={styles.authFieldsBlock}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{t('auth.emailLabel')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder={t('auth.emailPlaceholder')}
            testID="auth-email-input"
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
            testID="auth-password-input"
          />
        </View>

        {mode === 'signUp' ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t('auth.confirmPasswordLabel')}</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder={t('auth.confirmPasswordPlaceholder')}
              testID="auth-confirm-password-input"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.authActionsBlock}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.buttonPressed,
            submitting && styles.buttonDisabled,
          ]}
          onPress={onAuth}
          disabled={submitting}
          testID="auth-submit-button"
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
        ) : (
          <View style={styles.authForgotSpacer} />
        )}
      </View>
    </View>
  );
}
