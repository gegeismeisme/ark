import type { Dispatch, SetStateAction } from 'react';
import { Text, View } from 'react-native';

import type { AuthMode } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';
import { AuthModeToggle } from './AuthModeToggle';
import { AuthPanel, type AuthPanelProps } from './AuthPanel';

type AuthFormCardProps = AuthPanelProps & {
  mode: AuthMode;
  setMode: Dispatch<SetStateAction<AuthMode>>;
};

export function AuthFormCard({
  mode,
  setMode,
  ...panelProps
}: AuthFormCardProps) {
  return (
    <View style={styles.authFormSection}>
      <View style={styles.authFormCard}>
        <View style={styles.authFormHeader}>
          <Text style={styles.authFormTitle}>
            {mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
          </Text>
          <Text style={styles.authFormSubtitle}>{t('app.login.formSubtitle')}</Text>
        </View>

        <View style={styles.authFormCardBody}>
          <View style={styles.authFormSections}>
            <AuthModeToggle mode={mode} setMode={setMode} />
            <AuthPanel mode={mode} {...panelProps} />
          </View>
        </View>
      </View>
    </View>
  );
}
