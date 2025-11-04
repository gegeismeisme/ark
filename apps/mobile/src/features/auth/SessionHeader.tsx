'use client';

import type { Session } from '@supabase/supabase-js';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { styles } from '../../styles/appStyles';

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
        <Text style={styles.sessionLabel}>Signed in as</Text>
        <Text style={styles.sessionEmail}>{session.user.email ?? 'Unverified email'}</Text>
        <Text style={styles.sessionAid}>User ID: {session.user.id.slice(0, 8)}…</Text>
        {lastSyncedAt ? (
          <Text style={styles.syncHint}>Last synced at {lastSyncedAt}</Text>
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
              <Text style={styles.secondaryButtonText}>Refresh tasks</Text>
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
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
