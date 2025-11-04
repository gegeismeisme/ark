'use client';

import type { Session } from '@supabase/supabase-js';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { styles } from '../../styles/appStyles';
import { t } from '../../i18n';

type SessionHeaderProps = {
  session: Session;
  signOutLoading: boolean;
  onSignOut: () => void;
  lastSyncedAt: string | null;
  onReload?: () => Promise<void> | void;
  syncing?: boolean;
};

export function SessionHeader({
  session,
  signOutLoading,
  onSignOut,
  lastSyncedAt,
  onReload,
  syncing,
}: SessionHeaderProps) {
  return (
    <View style={styles.sessionBlock}>
      <View>
        <Text style={styles.sessionLabel}>{t('session.signedInAs')}</Text>
        <Text style={styles.sessionEmail}>{session.user.email ?? t('session.unverifiedEmail')}</Text>
        <Text style={styles.sessionAid}>{t('session.userId', { id: session.user.id.slice(0, 8) })}</Text>
        {lastSyncedAt ? (
          <Text style={styles.syncHint}>{t('session.lastSynced', { time: lastSyncedAt })}</Text>
        ) : null}
      </View>

      <View style={styles.sessionActions}>
        {onReload ? (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressedLight,
              syncing && styles.buttonDisabled,
            ]}
            onPress={() => void onReload()}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <Text style={styles.secondaryButtonText}>{t('session.refresh')}</Text>
            )}
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressedLight,
            signOutLoading && styles.buttonDisabled,
          ]}
          onPress={onSignOut}
          disabled={signOutLoading}
        >
          {signOutLoading ? (
            <ActivityIndicator color="#374151" />
          ) : (
            <Text style={styles.secondaryButtonText}>{t('session.signOut')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
