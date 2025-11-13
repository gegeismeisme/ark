import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type HomeHeaderProps = {
  name: string;
  subtitle?: string;
  onPressProfile: () => void;
};

export function HomeHeader({ name, subtitle, onPressProfile }: HomeHeaderProps) {
  return (
    <Pressable style={styles.homeHeader} onPress={onPressProfile}>
      <View style={styles.homeHeaderText}>
        <Text style={styles.homeGreeting}>{t('home.greeting', { name })}</Text>
        <Text style={styles.homeGreetingSubtitle}>{subtitle ?? t('home.greetingSubtitle')}</Text>
      </View>
      <View style={styles.homeHeaderIcons}>
        <View style={styles.homeAvatar}>
          <Text style={styles.homeAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
        </View>
      </View>
    </Pressable>
  );
}
