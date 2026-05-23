import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from './useApiClient';

export type NotificationType =
  | 'booking_confirmation'
  | 'waitlist_promotion'
  | 'class_change'
  | 'class_cancellation'
  | 'class_reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

interface UseNotificationsOptions {
  page?: number;
  limit?: number;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(options?: UseNotificationsOptions): UseNotificationsReturn {
  const { page = 1, limit = 20 } = options ?? {};
  const apiClient = useApiClient();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/me/notifications?page=${page}&limit=${limit}`,
      ) as NotificationsResponse;
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch {
      // Error is handled by the API client (401 redirect etc.)
      // Keep current state on failure
    } finally {
      setLoading(false);
    }
  }, [apiClient, page, limit]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await apiClient.patch(`/api/me/notifications/${id}/read`, {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, [apiClient]);

  const markAllAsRead = useCallback(async () => {
    await apiClient.patch('/api/me/notifications/read-all', {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [apiClient]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
  };
}
