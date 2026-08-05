import { useState, useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useApiClient } from './useApiClient';

interface UsePushTokenReturn {
  pushToken: string | null;
  permissionStatus: Notifications.PermissionStatus | null;
}

export function usePushToken(): UsePushTokenReturn {
  const apiClient = useApiClient();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | null>(null);

  useEffect(() => {
    async function registerForPushNotifications() {
      if (!Device.isDevice) {
        return;
      }

      // expo-notifications and expo are on skewed versions here, so the
      // PermissionResponse type imported by expo-notifications drops `status`.
      // Read it through a narrow cast to the base permission shape.
      const { status: existingStatus } = (await Notifications.getPermissionsAsync()) as {
        status: Notifications.PermissionStatus;
      };
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = (await Notifications.requestPermissionsAsync()) as {
          status: Notifications.PermissionStatus;
        };
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== 'granted') {
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;
      setPushToken(token);

      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await apiClient.post('/api/me/notifications/push-token', { token, platform });
    }

    void registerForPushNotifications();
  }, [apiClient]);

  return { pushToken, permissionStatus };
}
