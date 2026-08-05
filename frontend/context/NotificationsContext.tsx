import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/hooks/useAuth';
import { useRefreshOnAppActive } from '@/hooks/useRefreshOnAppActive';

// Notification type names mirror the backend contract
// (GetNotificationsResponseDto.items[].type). Keep these in sync with
// backend/src/api/notification/dto/notification-response.dto.ts.
export type NotificationType =
  | 'booking_confirmed'
  | 'waitlist_promoted'
  | 'class_cancelled'
  | 'class_changed'
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

// Matches GetNotificationsResponseDto — the list lives under `items`.
interface NotificationsResponse {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearRead: () => Promise<void>;
}

const PAGE = 1;
const LIMIT = 20;

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/**
 * App-wide notification state. Fetched once and shared, so the bell badge and
 * the notifications screen read the same cached unreadCount instead of each
 * component instance restarting at 0 on mount (which caused the badge to pop
 * in a beat late after navigation).
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  // Public mode so constructing the client never throws while unauthenticated
  // (this provider mounts at the root, above login). The token is still
  // attached once present, and the isAuthenticated gate below prevents any
  // request before sign-in.
  const apiClient = useApiClient({ public: true });
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = (await apiClient.get(
        `/api/me/notifications?page=${PAGE}&limit=${LIMIT}`,
      )) as NotificationsResponse;
      setNotifications(response.items ?? []);
      setUnreadCount(response.unreadCount ?? 0);
    } catch {
      // Error is handled by the API client (401 redirect etc.)
      // Keep current state on failure.
    } finally {
      setLoading(false);
    }
  }, [apiClient, isAuthenticated]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  // Refetch when the app returns to the foreground, so the bell badge reflects
  // notifications created while the app was backgrounded (e.g. a waitlist
  // promotion). This provider lives above the navigator, so it drives the
  // global badge regardless of which screen is focused.
  useRefreshOnAppActive(useCallback(() => void fetchNotifications(), [fetchNotifications]));

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(
    async (id: string) => {
      await apiClient.patch(`/api/me/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [apiClient],
  );

  const markAllAsRead = useCallback(async () => {
    await apiClient.patch('/api/me/notifications/read-all', {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [apiClient]);

  const clearRead = useCallback(async () => {
    await apiClient.delete('/api/me/notifications/read');
    // Drop read notifications locally; unreadCount is unaffected since only
    // already-read items are removed.
    setNotifications((prev) => prev.filter((n) => !n.read));
  }, [apiClient]);

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead, clearRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
}
