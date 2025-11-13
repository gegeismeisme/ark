import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

const QUICK_ACTIONS = [
  { key: 'publish', icon: 'create-outline', labelKey: 'home.quickActions.publish' },
  { key: 'join', icon: 'people-circle-outline', labelKey: 'home.quickActions.join' },
  { key: 'scan', icon: 'qr-code-outline', labelKey: 'home.quickActions.scan' },
  { key: 'more', icon: 'apps-outline', labelKey: 'home.quickActions.more' },
] as const;

export type QuickActionKey = (typeof QUICK_ACTIONS)[number]['key'];

type HomeQuickActionMenuProps = {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (action: QuickActionKey) => void;
};

export function HomeQuickActionMenu({ visible, onDismiss, onSelect }: HomeQuickActionMenuProps) {
  if (!visible) return null;

  return (
    <View style={styles.homeQuickMenuOverlay} pointerEvents="box-none">
      <Pressable style={styles.homeQuickMenuBackdrop} onPress={onDismiss} />
      <View style={styles.homeQuickMenuContainer} pointerEvents="box-none">
        <View style={styles.homeQuickMenu}>
          <View style={styles.homeQuickMenuArrow} />
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.key}
              style={styles.homeQuickMenuItem}
              onPress={() => onSelect(action.key)}
            >
              <Ionicons name={action.icon} size={18} color="#0f172a" style={styles.homeQuickMenuIcon} />
              <Text style={styles.homeQuickMenuLabel}>{t(action.labelKey)}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
