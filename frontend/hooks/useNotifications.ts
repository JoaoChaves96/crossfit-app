// Notification state now lives in a single app-wide provider so the bell badge
// and the notifications screen share one fetch and one unreadCount. This module
// re-exports the context hook and its types to keep existing import paths
// (@/hooks/useNotifications) working.
export {
  useNotifications,
  type Notification,
  type NotificationType,
  type NotificationsContextValue as UseNotificationsReturn,
} from '@/context/NotificationsContext';
