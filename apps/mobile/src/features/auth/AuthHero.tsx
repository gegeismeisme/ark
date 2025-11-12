import { Text, View } from 'react-native';

import type { AuthMode } from '../../types';
import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type AuthHeroProps = {
  mode: AuthMode;
};

export function AuthHero({ mode }: AuthHeroProps) {
  const hint =
    mode === 'signUp' ? t('app.login.heroHintSignUp') : t('app.login.heroHintSignIn');

  return (
    <View style={styles.authHeroSection}>
      <Text style={styles.authHeroBadge}>{t('app.login.heroBadgeWord')}</Text>
      <Text style={styles.authHeroHint}>{hint}</Text>
    </View>
  );
}
