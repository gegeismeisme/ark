import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../styles/appStyles';

type AccountSectionProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function AccountSection({ title, children, defaultOpen = false }: AccountSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.accountSection}>
      <Pressable style={styles.accountSectionHeader} onPress={() => setOpen((prev) => !prev)}>
        <Text style={styles.accountSectionTitle}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#94a3b8" />
      </Pressable>
      {open ? <View style={styles.accountSectionBody}>{children}</View> : null}
    </View>
  );
}
