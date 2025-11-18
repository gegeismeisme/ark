import { Pressable, Text, View } from 'react-native';

import { styles } from '../../../styles/appStyles';

type PublishFooterProps = {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  backLabel?: string;
  disabled?: boolean;
};

export function PublishFooter({ onBack, onNext, nextLabel, backLabel, disabled }: PublishFooterProps) {
  return (
    <View style={styles.publishFooter}>
      {onBack ? (
        <Pressable style={[styles.secondaryButton, styles.publishFooterButton]} onPress={onBack}>
          <Text style={styles.secondaryButtonText}>{backLabel ?? 'Back'}</Text>
        </Pressable>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      <Pressable
        style={[
          styles.primaryButton,
          styles.publishFooterButton,
          disabled && styles.buttonDisabled,
        ]}
        disabled={disabled}
        onPress={onNext}
      >
        <Text style={styles.primaryButtonText}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}
