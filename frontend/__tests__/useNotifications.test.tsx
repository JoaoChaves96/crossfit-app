/**
 * Tests for useNotifications hook.
 *
 * Verifies fetching notifications, marking as read, and marking all as read.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { AuthWrapper } from '@/test-utils/auth-wrapper';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/hooks/useNotifications';

// ─── Mock API client ─────────────────────────────────────────────────────────

const mockGet = jest.fn();
const mockPatch = jest.fn();

const mockApiClient = {
  get: mockGet,
  post: jest.fn(),
  patch: mockPatch,
  delete: jest.fn(),
};

jest.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => mockApiClient,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'notif-1',
    type: 'booking_confirmation',
    title: 'Booking Confirmed',
    body: 'Your spot is reserved.',
    data: null,
    read: false,
    createdAt: '2026-05-23T10:00:00Z',
    ...overrides,
  };
}

function makeNotificationsResponse(notifications: Notification[], unreadCount?: number) {
  return {
    notifications,
    total: notifications.length,
    unreadCount: unreadCount ?? notifications.filter((n) => !n.read).length,
  };
}

// ─── Wrapper ─────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthWrapper>{children}</AuthWrapper>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useNotifications — fetching', () => {
  it('starts in loading state', () => {
    // Arrange
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves

    // Act
    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Assert
    expect(result.current.loading).toBe(true);
    expect(result.current.notifications).toEqual([]);
  });

  it('fetches notifications on mount and sets loading to false', async () => {
    // Arrange
    const notif = makeNotification();
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([notif], 1));

    // Act
    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.notifications).toEqual([notif]);
    expect(result.current.unreadCount).toBe(1);
  });

  it('calls the correct API path with default page and limit', async () => {
    // Arrange
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([]));

    // Act
    renderHook(() => useNotifications(), { wrapper });

    // Assert
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/me/notifications?page=1&limit=20'));
  });

  it('uses custom page and limit when provided', async () => {
    // Arrange
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([]));

    // Act
    renderHook(() => useNotifications({ page: 2, limit: 10 }), { wrapper });

    // Assert
    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/me/notifications?page=2&limit=10'));
  });

  it('keeps previous state when fetch fails', async () => {
    // Arrange
    const notif = makeNotification();
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([notif], 1));

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act — simulate refresh failure
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    await act(async () => { await result.current.refresh(); });

    // Assert — notifications remain from first fetch
    expect(result.current.notifications).toEqual([notif]);
    expect(result.current.unreadCount).toBe(1);
  });
});

describe('useNotifications — refresh', () => {
  it('re-fetches notifications when refresh is called', async () => {
    // Arrange
    const notif1 = makeNotification({ id: 'notif-1' });
    const notif2 = makeNotification({ id: 'notif-2', title: 'New one' });
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([notif1], 1));

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([notif1, notif2], 2));
    await act(async () => { await result.current.refresh(); });

    // Assert
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.unreadCount).toBe(2);
  });
});

describe('useNotifications — markAsRead', () => {
  it('calls PATCH on the correct endpoint', async () => {
    // Arrange
    const notif = makeNotification({ id: 'notif-42' });
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([notif], 1));
    mockPatch.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act
    await act(async () => { await result.current.markAsRead('notif-42'); });

    // Assert
    expect(mockPatch).toHaveBeenCalledWith('/api/me/notifications/notif-42/read', {});
  });

  it('optimistically updates the notification to read and decrements unreadCount', async () => {
    // Arrange
    const notif = makeNotification({ id: 'notif-1', read: false });
    mockGet.mockResolvedValueOnce(makeNotificationsResponse([notif], 1));
    mockPatch.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act
    await act(async () => { await result.current.markAsRead('notif-1'); });

    // Assert
    expect(result.current.notifications[0].read).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });
});

describe('useNotifications — markAllAsRead', () => {
  it('calls PATCH on the read-all endpoint', async () => {
    // Arrange
    const notifs = [
      makeNotification({ id: 'n1', read: false }),
      makeNotification({ id: 'n2', read: false }),
    ];
    mockGet.mockResolvedValueOnce(makeNotificationsResponse(notifs, 2));
    mockPatch.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act
    await act(async () => { await result.current.markAllAsRead(); });

    // Assert
    expect(mockPatch).toHaveBeenCalledWith('/api/me/notifications/read-all', {});
  });

  it('marks all notifications as read and sets unreadCount to 0', async () => {
    // Arrange
    const notifs = [
      makeNotification({ id: 'n1', read: false }),
      makeNotification({ id: 'n2', read: false }),
    ];
    mockGet.mockResolvedValueOnce(makeNotificationsResponse(notifs, 2));
    mockPatch.mockResolvedValueOnce({ success: true });

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Act
    await act(async () => { await result.current.markAllAsRead(); });

    // Assert
    expect(result.current.notifications.every((n) => n.read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });
});
