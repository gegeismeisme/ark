import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { styles } from '../../../styles/appStyles';

type PublishHeaderProps = {
  title: string;
  subtitle?: string | null;
  onClose?: () => void;
  stepLabel?: string;
};

export function PublishHeader({ title, subtitle, onClose, stepLabel }: PublishHeaderProps) {
  return (
    <View style={styles.publishStepHeader}>
      <View style={styles.publishStepTitleBlock}>
        {stepLabel ? <Text style={styles.publishStepLabel}>{stepLabel}</Text> : null}
        <Text style={styles.publishStepTitle}>{title}</Text>
        {subtitle ? <Text style={styles.publishStepSubtitle}>{subtitle}</Text> : null}
      </View>
      {onClose ? (
        <Pressable style={styles.publishModalClose} onPress={onClose}>
          <Ionicons name="close" size={18} color="#0f172a" />
        </Pressable>
      ) : null}
    </View>
  );
}
