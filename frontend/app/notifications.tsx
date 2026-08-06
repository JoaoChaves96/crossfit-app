import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNotifications, type Notification, type NotificationType } from '@/hooks/useNotifications';
import { AppColors, Spacing } from '@/constants/theme';
import { SafeScreen } from '@/components/SafeScreen';
import { styles } from './notifications.styles';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const NOTIFICATION_ICONS: Record<NotificationType, { name: IoniconName; bgColor: string }> = {
  booking_confirmed: { name: 'checkmark-circle', bgColor: AppColors.successBgFaint },
  waitlist_promoted: { name: 'arrow-up-circle', bgColor: AppColors.warningBgOrange },
  class_changed: { name: 'create', bgColor: AppColors.surfaceBlueLight },
  class_cancelled: { name: 'close-circle', bgColor: AppColors.errorBg },
  class_reminder: { name: 'time', bgColor: AppColors.surfaceBlueLight },
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
  const iconConfig = NOTIFICATION_ICONS[notification.type] ?? {
    name: 'notifications' as IoniconName,
    bgColor: AppColors.backgroundLight,
  };

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
        <Ionicons size={18} name={iconConfig.name} color={AppColors.textGray600} />
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
      {/* Read-status indicator: a filled dot for unread, a check for read.
          This is the single source of truth for read state — the left icon is
          type-based (what the notification is), not read state. */}
      <View style={styles.statusIndicator}>
        {notification.read ? (
          <Ionicons
            name="checkmark"
            size={16}
            color={AppColors.textGray500}
            testID={`notification-read-${notification.id}`}
          />
        ) : (
          <View
            style={styles.unreadDot}
            testID={`notification-unread-${notification.id}`}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { notifications, loading, refresh, markAsRead, markAllAsRead, clearRead, unreadCount } =
    useNotifications();
  const router = useRouter();

  // Refetch each time the screen gains focus, so opening the bell shows the
  // latest notifications without requiring a manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const readCount = notifications.filter((n) => n.read).length;

  const handleClearRead = () => {
    Alert.alert(
      'Clear read notifications',
      `Remove ${readCount} read notification${readCount === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            void clearRead();
          },
        },
      ],
    );
  };

  if (loading && notifications.length === 0) {
    return (
      <View style={styles.centeredState} testID="notifications-loading">
        <ActivityIndicator size="large" color={AppColors.brandPrimary} />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="notifications-screen">
      <SafeScreen style={styles.headerRow} extraTopPadding={Spacing.md}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="notifications-back-button"
          >
            <Ionicons name="chevron-back" size={24} color={AppColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
              testID="mark-all-read-button"
            >
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
          {readCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleClearRead}
              testID="clear-read-button"
            >
              <Text style={styles.clearReadText}>Clear read</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeScreen>

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
