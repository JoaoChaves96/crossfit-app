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

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
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
