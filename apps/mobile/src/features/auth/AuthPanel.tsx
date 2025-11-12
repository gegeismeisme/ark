import type { Dispatch, SetStateAction } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  confirmPassword: string;
  setConfirmPassword: Dispatch<SetStateAction<string>>;
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
  confirmPassword,
  setConfirmPassword,
  submitting,
  onAuth,
  onResetPassword,
}: AuthPanelProps) {
  const socialOptions = [
    { key: 'google', icon: 'logo-google' as const, label: t('app.login.social.google') },
    { key: 'microsoft', icon: 'logo-microsoft' as const, label: t('app.login.social.microsoft') },
    { key: 'apple', icon: 'logo-apple' as const, label: t('app.login.social.apple') },
  ];

  return (
    <View style={styles.authFormStack}>
      <View style={styles.authFormHeader}>
        <Text style={styles.authFormTitle}>
          {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
        </Text>
        <Text style={styles.authFormSubtitle}>{t('app.login.formSubtitle')}</Text>
      </View>

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
      ) : null}

      <View style={styles.authDividerRow}>
        <View style={styles.authDividerLine} />
        <Text style={styles.authDividerLabel}>{t('app.login.socialTitle')}</Text>
        <View style={styles.authDividerLine} />
      </View>

      <View style={styles.authSocialIconRow}>
        {socialOptions.map((option) => (
          <View key={option.key} style={styles.authSocialIconButton}>
            <Ionicons
              name={option.icon}
              size={18}
              style={styles.authSocialIconOnly}
              accessibilityLabel={option.label}
            />
          </View>
        ))}
      </View>
      <Text style={styles.authSocialHint}>
        {t('app.login.socialSubtitle')} · {t('app.login.socialSoon')}
      </Text>
    </View>
  );
}
