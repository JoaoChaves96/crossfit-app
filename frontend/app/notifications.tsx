/*
 * ─── Clean Ink · Athlete Notifications (restyle) ─────────────────────────────
 * Sibling of the shipped athlete screens: white-surface hairline header, quiet
 * list, tokens + primitives only. UNREAD vs READ reads through tone + weight +
 * a tonal recess — unread rows sit on the white surface with strong ink and a
 * single crimson dot (the one accent per row); read rows recede onto the base
 * ground with muted ink and a quiet check. Data, handlers, and copy unchanged.
 */
import React, { useCallback } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { showConfirm } from '@/utils/alert';
import { useRouter, useFocusEffect } from 'expo-router';
import { useNotifications, type Notification, type NotificationType } from '@/hooks/useNotifications';
import { Accent, Ink, Space } from '@/constants/design';
import { SafeScreen } from '@/components/SafeScreen';
import { Text, Icon, type IconName } from '@/components/cleanink';
import { styles } from './notifications.styles';

// Type → drawn glyph. The glyph carries what the notification is; the circle is
// a neutral tonal recess (no color splash) so the crimson stays rationed.
const NOTIFICATION_ICONS: Record<NotificationType, IconName> = {
  booking_confirmed: 'check',
  waitlist_promoted: 'people',
  class_changed: 'edit',
  class_cancelled: 'close',
  class_reminder: 'time',
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
  const glyph: IconName = NOTIFICATION_ICONS[notification.type] ?? 'bell';
  const isRead = notification.read;

  return (
    <TouchableOpacity
      style={[styles.notificationItem, isRead && styles.notificationItemRead]}
      onPress={onPress}
      testID={`notification-item-${notification.id}`}
    >
      <View style={styles.iconContainer}>
        <Icon name={glyph} size={18} tone={isRead ? Ink.faint : Ink.muted} />
      </View>
      <View style={styles.contentContainer}>
        <Text
          size="body"
          weight={isRead ? 'regular' : 'semibold'}
          tone={isRead ? Ink.muted : Ink.strong}
        >
          {notification.title}
        </Text>
        <Text size="meta" tone={Ink.muted} style={styles.bodyText}>
          {notification.body}
        </Text>
        <Text size="meta" tone={Ink.faint}>{getTimeAgo(notification.createdAt)}</Text>
      </View>
      {/* Read-status indicator: a filled crimson dot for unread, a quiet check
          for read. This is the single source of truth for read state — the left
          glyph is type-based (what the notification is), not read state. */}
      <View style={styles.statusIndicator}>
        {isRead ? (
          <View testID={`notification-read-${notification.id}`}>
            <Icon name="check" size={16} tone={Ink.faint} />
          </View>
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
    // `showConfirm`, never `Alert.alert`: react-native-web's Alert is a literal
    // no-op (`static alert() {}`), so on web Clear silently did nothing.
    showConfirm(
      'Clear read notifications',
      `Remove ${readCount} read notification${readCount === 1 ? '' : 's'}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
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
        <ActivityIndicator size="large" color={Accent.base} />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="notifications-screen">
      <SafeScreen style={styles.headerRow} extraTopPadding={Space.md}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID="notifications-back-button"
          >
            <Icon name="back" size={24} tone={Ink.strong} />
          </TouchableOpacity>
          <Text size="screen" weight="bold" tracking="tight">Notifications</Text>
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
              testID="mark-all-read-button"
            >
              <Text size="meta" weight="semibold" tone={Ink.strong}>Mark all as read</Text>
            </TouchableOpacity>
          )}
          {readCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={handleClearRead}
              testID="clear-read-button"
            >
              <Text size="meta" weight="semibold" tone={Ink.muted}>Clear read</Text>
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
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="bell" size={30} tone={Ink.faint} />
            </View>
            <Text size="body" tone={Ink.muted} testID="notifications-empty">
              No notifications yet
            </Text>
          </View>
        }
        refreshing={loading}
        onRefresh={refresh}
        testID="notifications-list"
      />
    </View>
  );
}
