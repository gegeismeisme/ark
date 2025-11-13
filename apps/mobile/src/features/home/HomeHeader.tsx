import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type HomeHeaderProps = {
  name: string;
  subtitle?: string;
  onPressAvatar: () => void;
  onPressMenu: () => void;
};

export function HomeHeader({ name, subtitle, onPressAvatar, onPressMenu }: HomeHeaderProps) {
  return (
    <View style={styles.homeHeader}>
      <View style={styles.homeHeaderText}>
        <Text style={styles.homeGreeting}>{t('home.greeting', { name })}</Text>
        <Text style={styles.homeGreetingSubtitle}>{subtitle ?? t('home.greetingSubtitle')}</Text>
      </View>
      <View style={styles.homeHeaderIcons}>
        <Pressable style={styles.homeHeaderMenuButton} onPress={onPressMenu}>
          <Ionicons name="ellipsis-vertical" size={20} color="#0f172a" />
        </Pressable>
        <Pressable style={styles.homeAvatar} onPress={onPressAvatar}>
          <Text style={styles.homeAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}
