import React from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useNotifications, type Notification, type NotificationType } from '@/hooks/useNotifications';
import { AppColors } from '@/constants/theme';
import { styles } from './notifications.styles';

const NOTIFICATION_ICONS: Record<NotificationType, { name: string; bgColor: string }> = {
  booking_confirmation: { name: 'checkmark.circle', bgColor: AppColors.successBgFaint },
  waitlist_promotion: { name: 'arrow.up.circle', bgColor: AppColors.warningBgOrange },
  class_change: { name: 'pencil.circle', bgColor: AppColors.surfaceBlueLight },
  class_cancellation: { name: 'xmark.circle', bgColor: AppColors.errorBg },
  class_reminder: { name: 'clock', bgColor: AppColors.surfaceBlueLight },
};

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function NotificationItem({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const iconConfig = NOTIFICATION_ICONS[notification.type] ?? { name: 'bell', bgColor: AppColors.backgroundLight };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.notificationItemUnread,
      ]}
      onPress={onPress}
      testID={`notification-item-${notification.id}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconConfig.bgColor }]}>
        <IconSymbol size={18} name={iconConfig.name} color={AppColors.textGray600} />
      </View>
      <View style={styles.contentContainer}>
        <Text
          style={[
            styles.titleText,
            !notification.read && styles.titleTextUnread,
          ]}
        >
          {notification.title}
        </Text>
        <Text style={styles.bodyText}>{notification.body}</Text>
        <Text style={styles.timeText}>{getTimeAgo(notification.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { notifications, loading, refresh, markAsRead, markAllAsRead, unreadCount } =
    useNotifications();

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.centeredState} testID="notifications-loading">
        <ActivityIndicator size="large" color={AppColors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="notifications-screen">
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
            testID="mark-all-read-button"
          >
            <Text style={styles.markAllText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => {
              if (!item.read) {
                void markAsRead(item.id);
              }
            }}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.centeredState,
        ]}
        ListEmptyComponent={
          <Text style={styles.emptyText} testID="notifications-empty">
            No notifications yet
          </Text>
        }
        refreshing={loading}
        onRefresh={refresh}
        testID="notifications-list"
      />
    </View>
  );
}
