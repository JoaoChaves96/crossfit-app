import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from 'expo-router';
import { AppColors } from '@/constants/theme';
import { styles } from './NotificationBell.styles';

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      style={styles.container}
      testID="notification-bell"
    >
      <IconSymbol size={24} name="bell" color={AppColors.textDark3} />
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
