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
        <Text style={styles.sessionLabel}>当前账号</Text>
        <Text style={styles.sessionEmail}>{session.user.email ?? '未验证邮箱'}</Text>
        <Text style={styles.sessionAid}>用户 ID：{session.user.id.slice(0, 8)}…</Text>
        {lastSyncedAt ? (
          <Text style={styles.syncHint}>最近同步：{lastSyncedAt}</Text>
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
              <Text style={styles.secondaryButtonText}>刷新任务</Text>
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
            <Text style={styles.secondaryButtonText}>退出登录</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}






