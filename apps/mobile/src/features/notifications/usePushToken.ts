import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { supabase } from '../../lib/supabaseClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type UsePushTokenResult = {
  token: string | null;
  registering: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

type RegistrationResult = {
  token: string | null;
  platform: 'ios' | 'android' | 'web' | 'unknown';
  deviceName?: string | null;
};

async function registerForPushNotifications(): Promise<RegistrationResult> {
  if (!Device.isDevice) {
    return { token: null, platform: 'web' };
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    throw new Error('通知权限被拒绝，请在系统设置中开启推送权限。');
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.expoConfig?.extra?.projectId ??
    Constants?.easConfig?.projectId;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return {
    token: tokenResponse.data,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'unknown',
    deviceName: Device.deviceName ?? null,
  };
}

export function usePushToken(session: Session | null): UsePushTokenResult {
  const userId = session?.user?.id ?? null;

  const [token, setToken] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (!userId) {
      setToken(null);
      setError(null);
      return;
    }

    setRegistering(true);
    setError(null);

    try {
      const { token: expoToken, platform, deviceName } = await registerForPushNotifications();
      if (!expoToken) {
        setToken(null);
        setRegistering(false);
        return;
      }

      const now = new Date().toISOString();
      const { error: upsertError } = await supabase
        .from('user_device_tokens')
        .upsert(
          {
            user_id: userId,
            token: expoToken,
            platform,
            device_name: deviceName ?? null,
            last_seen_at: now,
          },
          { onConflict: 'user_id,token' }
        );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setToken(expoToken);
    } catch (err) {
      console.error('[push] registration failed', err);
      setError(err instanceof Error ? err.message : '注册通知通道失败');
    } finally {
      setRegistering(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setToken(null);
      setError(null);
      return;
    }

    void register();
  }, [userId, register]);

  return useMemo(
    () => ({
      token,
      registering,
      error,
      refresh: register,
    }),
    [token, registering, error, register]
  );
}
