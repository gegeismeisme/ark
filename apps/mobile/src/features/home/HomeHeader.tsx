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
  const initial = (name?.trim()?.slice(0, 1) ?? '').toUpperCase() || 'A';

  return (
    <View style={styles.homeHeader}>
      <Pressable style={styles.homeAvatar} onPress={onPressAvatar}>
        <Text style={styles.homeAvatarText}>{initial}</Text>
      </Pressable>
      <View style={styles.homeHeaderText}>
        <Text style={styles.homeGreeting}>{t('home.greeting', { name })}</Text>
        <Text style={styles.homeGreetingSubtitle}>{subtitle ?? t('home.greetingSubtitle')}</Text>
      </View>
      <Pressable style={styles.homeHeaderActionButton} onPress={onPressMenu}>
        <Ionicons name="add" size={22} color="#ffffff" />
      </Pressable>
    </View>
  );
}
