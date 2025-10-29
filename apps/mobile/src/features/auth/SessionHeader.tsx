import type { Session } from '@supabase/supabase-js';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { styles } from '../../styles/appStyles';

type SessionHeaderProps = {
  session: Session;
  submitting: boolean;
  onSignOut: () => void;
};

export function SessionHeader({ session, submitting, onSignOut }: SessionHeaderProps) {
  return (
    <View style={styles.sessionBlock}>
      <View>
        <Text style={styles.sessionLabel}>当前账号</Text>
        <Text style={styles.sessionEmail}>{session.user.email ?? '未验证邮箱'}</Text>
        <Text style={styles.sessionAid}>用户 ID：{session.user.id.slice(0, 8)}…</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.buttonPressedLight,
          submitting && styles.buttonDisabled,
        ]}
        onPress={onSignOut}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#374151" />
        ) : (
          <Text style={styles.secondaryButtonText}>退出登录</Text>
        )}
      </Pressable>
    </View>
  );
}
