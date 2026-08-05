/**
 * Tests for the NotificationBell component and Notifications screen.
 */

import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  useFocusEffect: jest.fn((cb: () => void) => {
    require('react').useEffect(cb, []);
  }),
  Link: jest.fn(({ children }: { children: unknown }) => children),
  Redirect: jest.fn(() => null),
  Stack: { Screen: jest.fn(() => null) },
  Tabs: { Screen: jest.fn(() => null) },
}));

const mockUseNotifications = jest.fn();

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: (...args: unknown[]) => mockUseNotifications(...args),
}));

// NotificationBell reads auth state to decide whether to render; the component
// under test is the bell itself, so treat the user as authenticated.
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ isAuthenticated: true })),
}));

import { NotificationBell } from '@/components/NotificationBell';
import NotificationsScreen from '@/app/notifications';
import type { Notification } from '@/hooks/useNotifications';

// ─── Factories ──────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    body: 'Your spot is reserved.',
    data: null,
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function defaultHookReturn(overrides: Partial<ReturnType<typeof mockUseNotifications>> = {}) {
  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    refresh: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    clearRead: jest.fn(),
    ...overrides,
  };
}

// ─── NotificationBell Tests ─────────────────────────────────────────────────

describe('NotificationBell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders badge when unreadCount > 0', () => {
    mockUseNotifications.mockReturnValue(defaultHookReturn({ unreadCount: 5 }));

    render(<NotificationBell />);

    expect(screen.getByTestId('notification-badge')).toBeTruthy();
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('hides badge when unreadCount is 0', () => {
    mockUseNotifications.mockReturnValue(defaultHookReturn({ unreadCount: 0 }));

    render(<NotificationBell />);

    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('shows 9+ when unreadCount exceeds 9', () => {
    mockUseNotifications.mockReturnValue(defaultHookReturn({ unreadCount: 150 }));

    render(<NotificationBell />);

    expect(screen.getByText('9+')).toBeTruthy();
  });

  it('navigates to /notifications on press', () => {
    mockUseNotifications.mockReturnValue(defaultHookReturn({ unreadCount: 1 }));

    render(<NotificationBell />);
    fireEvent.press(screen.getByTestId('notification-bell'));

    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });
});

// ─── Notifications Screen Tests ─────────────────────────────────────────────

describe('NotificationsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a list of notifications', () => {
    const notifications = [
      makeNotification({ id: 'n1', title: 'First' }),
      makeNotification({ id: 'n2', title: 'Second', read: true }),
    ];
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications, unreadCount: 1 }),
    );

    render(<NotificationsScreen />);

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('shows empty state when no notifications', () => {
    mockUseNotifications.mockReturnValue(defaultHookReturn());

    render(<NotificationsScreen />);

    expect(screen.getByTestId('notifications-empty')).toBeTruthy();
    expect(screen.getByText('No notifications yet')).toBeTruthy();
  });

  it('shows loading indicator when loading with no data', () => {
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ loading: true, notifications: [] }),
    );

    render(<NotificationsScreen />);

    expect(screen.getByTestId('notifications-loading')).toBeTruthy();
  });

  it('calls markAsRead when tapping an unread notification', () => {
    const mockMarkAsRead = jest.fn();
    const notifications = [makeNotification({ id: 'n1', read: false })];
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications, unreadCount: 1, markAsRead: mockMarkAsRead }),
    );

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByTestId('notification-item-n1'));

    expect(mockMarkAsRead).toHaveBeenCalledWith('n1');
  });

  it('shows mark all as read button when there are unread notifications', () => {
    const notifications = [makeNotification({ id: 'n1', read: false })];
    const mockMarkAllAsRead = jest.fn();
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications, unreadCount: 1, markAllAsRead: mockMarkAllAsRead }),
    );

    render(<NotificationsScreen />);
    const button = screen.getByTestId('mark-all-read-button');
    fireEvent.press(button);

    expect(mockMarkAllAsRead).toHaveBeenCalled();
  });

  it('hides mark all as read button when unreadCount is 0', () => {
    const notifications = [makeNotification({ id: 'n1', read: true })];
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications, unreadCount: 0 }),
    );

    render(<NotificationsScreen />);

    expect(screen.queryByTestId('mark-all-read-button')).toBeNull();
  });

  it('shows a read check for read notifications and an unread dot for unread ones', () => {
    const notifications = [
      makeNotification({ id: 'n1', read: false }),
      makeNotification({ id: 'n2', read: true }),
    ];
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications, unreadCount: 1 }),
    );

    render(<NotificationsScreen />);

    // Unread → dot, no check. Read → check, no dot.
    expect(screen.getByTestId('notification-unread-n1')).toBeTruthy();
    expect(screen.queryByTestId('notification-read-n1')).toBeNull();
    expect(screen.getByTestId('notification-read-n2')).toBeTruthy();
    expect(screen.queryByTestId('notification-unread-n2')).toBeNull();
  });

  it('shows the clear read button only when read notifications exist', () => {
    const withRead = [makeNotification({ id: 'n1', read: true })];
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications: withRead, unreadCount: 0 }),
    );
    const { rerender } = render(<NotificationsScreen />);
    expect(screen.getByTestId('clear-read-button')).toBeTruthy();

    const allUnread = [makeNotification({ id: 'n2', read: false })];
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications: allUnread, unreadCount: 1 }),
    );
    rerender(<NotificationsScreen />);
    expect(screen.queryByTestId('clear-read-button')).toBeNull();
  });

  it('prompts for confirmation and calls clearRead when confirmed', () => {
    const mockClearRead = jest.fn();
    const alertSpy = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _msg, buttons) => {
        // Invoke the destructive "Clear" button's handler.
        const clearBtn = buttons?.find((b) => b.style === 'destructive');
        clearBtn?.onPress?.();
      });

    const notifications = [makeNotification({ id: 'n1', read: true })];
    mockUseNotifications.mockReturnValue(
      defaultHookReturn({ notifications, unreadCount: 0, clearRead: mockClearRead }),
    );

    render(<NotificationsScreen />);
    fireEvent.press(screen.getByTestId('clear-read-button'));

    expect(alertSpy).toHaveBeenCalled();
    expect(mockClearRead).toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
