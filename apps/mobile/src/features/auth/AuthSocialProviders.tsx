import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

const SOCIAL_OPTIONS = [
  { key: 'google', icon: 'logo-google' as const, label: 'Google' },
  { key: 'microsoft', icon: 'logo-microsoft' as const, label: 'Microsoft' },
  { key: 'apple', icon: 'logo-apple' as const, label: 'Apple' },
];

export function AuthSocialProviders() {
  return (
    <View style={styles.authSocialWrapper}>
      <Text style={styles.authSocialHeading}>{t('app.login.socialTitle')}</Text>
      <View style={styles.authSocialSection}>
        <View style={styles.authSocialIconRow}>
          {SOCIAL_OPTIONS.map((option) => (
            <View key={option.key} style={styles.authSocialIconButton}>
              <Ionicons
                name={option.icon}
                size={20}
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
    </View>
  );
}
