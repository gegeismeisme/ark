import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { supabase } from '../../lib/supabaseClient';
import { t } from '../../i18n';

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

type Extras = {
  eas?: {
    projectId?: string;
  };
  projectId?: string;
};

const resolveProjectId = () => {
  const configExtra = Constants?.expoConfig?.extra as Extras | undefined;
  const manifestExtra =
    (Constants as unknown as {
      manifest?: { extra?: Extras };
      manifest2?: { extra?: Extras };
    }).manifest?.extra ??
    (Constants as unknown as {
      manifest?: { extra?: Extras };
      manifest2?: { extra?: Extras };
    }).manifest2?.extra;

  const easProjectId =
    configExtra?.eas?.projectId ??
    manifestExtra?.eas?.projectId ??
    (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId ??
    null;

  return easProjectId ?? configExtra?.projectId ?? manifestExtra?.projectId ?? null;
};

const PROJECT_ID = resolveProjectId();

async function registerForPushNotifications(): Promise<RegistrationResult> {
  if (!Device.isDevice) {
    return { token: null, platform: 'web' };
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    throw new Error(t('push.permissionDenied'));
  }

  if (!PROJECT_ID) {
    throw new Error(t('push.missingProject'));
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
  const warningMessage = t('push.warningEmailFallback');

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
      const rows: Array<Record<string, unknown>> = [
        {
          user_id: userId,
          token: expoToken,
          platform,
          provider: 'expo',
          device_name: deviceName ?? null,
          last_seen_at: now,
        },
      ];

      try {
        const nativeTokenResult = await Notifications.getDevicePushTokenAsync();
        const nativeToken =
          nativeTokenResult && typeof nativeTokenResult.data === 'string'
            ? nativeTokenResult.data
            : null;
        if (nativeToken) {
          const provider = Platform.OS === 'ios' ? 'apns' : 'fcm';
          rows.push({
            user_id: userId,
            token: nativeToken,
            platform,
            provider,
            device_name: deviceName ?? null,
            last_seen_at: now,
          });
        }
      } catch (nativeErr) {
        console.warn('[push] native token acquisition failed', nativeErr);
      }

      const { error: upsertError } = await supabase
        .from('user_device_tokens')
        .upsert(rows, { onConflict: 'user_id,provider,token' });

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      setToken(expoToken);
    } catch (err) {
      console.error('[push] registration failed', err);
      setError(warningMessage);
    } finally {
      setRegistering(false);
    }
  }, [userId, warningMessage]);

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
