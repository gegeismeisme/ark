import type { Dispatch, SetStateAction } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AuthMode } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type AuthModeToggleProps = {
  mode: AuthMode;
  setMode: Dispatch<SetStateAction<AuthMode>>;
};

export function AuthModeToggle({ mode, setMode }: AuthModeToggleProps) {
  return (
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
  );
}
