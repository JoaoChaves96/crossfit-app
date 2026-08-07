import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Icon, Text } from '@/components/cleanink';
import { styles } from './NotificationBell.styles';

function NotificationBellInner() {
  const { unreadCount } = useNotifications();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      style={styles.container}
      testID="notification-bell"
    >
      <Icon size={24} name="bell" tone="strong" />
      {unreadCount > 0 && (
        <View style={styles.badge} testID="notification-badge">
          <Text style={styles.badgeText} size="label" weight="bold" tone="inverse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return <NotificationBellInner />;
}
