'use client';

import type { FC } from 'react';
import { Pressable, Text, View } from 'react-native';

import { styles } from '../styles/appStyles';

type StatusToastProps = {
  icon?: string;
  tone?: 'info' | 'warning' | 'danger';
  message: string;
  actionLabel?: string;
  onActionPress?: () => void;
};

export const StatusToast: FC<StatusToastProps> = ({
  icon = '⚠️',
  tone = 'info',
  message,
  actionLabel,
  onActionPress,
}) => {
  const containerStyle =
    tone === 'warning'
      ? styles.toastWarning
      : tone === 'danger'
        ? styles.toastDanger
        : styles.toastInfo;

  return (
    <View style={[styles.toastContainer, containerStyle]}>
      <View style={styles.toastMessageRow}>
        <Text style={styles.toastIcon}>{icon}</Text>
        <Text style={styles.toastMessage}>{message}</Text>
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          style={({ pressed }) => [
            styles.toastActionButton,
            pressed && styles.buttonPressedLight,
          ]}
          onPress={onActionPress}
        >
          <Text style={styles.toastActionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};
