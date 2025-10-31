import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
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

const PROJECT_ID =
  Constants?.expoConfig?.extra?.eas?.projectId ??
  Constants?.expoConfig?.extra?.projectId ??
  Constants?.easConfig?.projectId ??
  null;

async function registerForPushNotifications(): Promise<RegistrationResult> {
  if (!Device.isDevice) {
    return { token: null, platform: 'web' };
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    throw new Error('Push permission denied. Please enable notifications in system settings.');
  }

  if (!PROJECT_ID) {
    throw new Error('Missing Expo projectId. Cannot register for push notifications.');
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return {
    token: data,
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
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to register push notifications. Please try again later.';
      setError(message);
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
