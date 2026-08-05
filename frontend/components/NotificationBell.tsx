import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { AppColors } from '@/constants/theme';
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
      <Ionicons size={24} name="notifications-outline" color={AppColors.textDark3} />
      {unreadCount > 0 && (
        <View style={styles.badge} testID="notification-badge">
          <Text style={styles.badgeText}>
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
