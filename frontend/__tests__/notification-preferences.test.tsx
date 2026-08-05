/**
 * Tests for notification preference toggles in the Profile screen.
 *
 * Covers:
 *   - All 4 toggles render with correct initial state
 *   - Toggling a preference calls PATCH /api/me with correct payload
 *   - Optimistic revert on API failure
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { createMockApiClient } from '@/test-utils/mock-api-client';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isDesktop: false }),
}));

// Notification state lives in an app-wide provider not mounted in these tests;
// stub it so the profile screen's NotificationBell renders without a provider.
jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    refresh: jest.fn(() => Promise.resolve()),
    markAsRead: jest.fn(() => Promise.resolve()),
    markAllAsRead: jest.fn(() => Promise.resolve()),
  }),
}));

import { createApiClient } from '@/utils/api-client';

// ─── Data factories ───────────────────────────────────────────────────────────

const GYM_ID = 'gym-1';

function buildProfile(overrides?: Record<string, unknown>) {
  return {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'athlete',
    gymId: GYM_ID,
    createdAt: '2024-01-15T00:00:00.000Z',
    notificationPreferences: {
      booking_confirmations: true,
      waitlist_updates: true,
      class_changes: false,
      class_reminders: true,
    },
    ...overrides,
  };
}

// ─── Render helpers ───────────────────────────────────────────────────────────

const AUTH_CONTEXT: AuthContextType = {
  user: { id: 'user-1', email: 'john@example.com', role: 'athlete', gymId: GYM_ID },
  token: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
};

function renderScreen(mockApi = createMockApiClient()) {
  (createApiClient as jest.Mock).mockReturnValue(mockApi);

  return render(
    <AuthContext.Provider value={AUTH_CONTEXT}>
      <ProfileScreen />
    </AuthContext.Provider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Notification Preferences', () => {
  it('renders all 4 notification toggles', async () => {
    // Arrange
    const mockApi = createMockApiClient();
    mockApi.get.mockResolvedValueOnce(buildProfile());

    // Act
    renderScreen(mockApi);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('notification-toggle-booking_confirmations')).toBeTruthy();
    });
    expect(screen.getByTestId('notification-toggle-waitlist_updates')).toBeTruthy();
    expect(screen.getByTestId('notification-toggle-class_changes')).toBeTruthy();
    expect(screen.getByTestId('notification-toggle-class_reminders')).toBeTruthy();
  });

  it('initializes toggles from profile response', async () => {
    // Arrange
    const mockApi = createMockApiClient();
    mockApi.get.mockResolvedValueOnce(buildProfile({
      notificationPreferences: {
        booking_confirmations: true,
        waitlist_updates: false,
        class_changes: false,
        class_reminders: true,
      },
    }));

    // Act
    renderScreen(mockApi);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('notification-toggle-booking_confirmations')).toBeTruthy();
    });
    expect(screen.getByTestId('notification-toggle-booking_confirmations').props.value).toBe(true);
    expect(screen.getByTestId('notification-toggle-waitlist_updates').props.value).toBe(false);
    expect(screen.getByTestId('notification-toggle-class_changes').props.value).toBe(false);
    expect(screen.getByTestId('notification-toggle-class_reminders').props.value).toBe(true);
  });

  it('calls PATCH /api/me with correct payload when toggled', async () => {
    // Arrange
    const mockApi = createMockApiClient();
    mockApi.get.mockResolvedValueOnce(buildProfile());
    mockApi.patch.mockResolvedValueOnce(buildProfile());

    renderScreen(mockApi);

    await waitFor(() => {
      expect(screen.getByTestId('notification-toggle-class_changes')).toBeTruthy();
    });

    // Act — toggle class_changes from false to true
    fireEvent(screen.getByTestId('notification-toggle-class_changes'), 'valueChange', true);

    // Assert
    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith(
        '/api/me',
        { notificationPreferences: { class_changes: true } }
      );
    });
  });

  it('reverts toggle on API failure', async () => {
    // Arrange
    const mockApi = createMockApiClient();
    mockApi.get.mockResolvedValueOnce(buildProfile({
      notificationPreferences: {
        booking_confirmations: true,
        waitlist_updates: true,
        class_changes: false,
        class_reminders: true,
      },
    }));
    mockApi.patch.mockRejectedValueOnce(new Error('Network error'));

    renderScreen(mockApi);

    await waitFor(() => {
      expect(screen.getByTestId('notification-toggle-class_changes')).toBeTruthy();
    });

    // Act — toggle class_changes from false to true (will fail)
    fireEvent(screen.getByTestId('notification-toggle-class_changes'), 'valueChange', true);

    // Assert — should revert back to false
    await waitFor(() => {
      expect(screen.getByTestId('notification-toggle-class_changes').props.value).toBe(false);
    });
  });
});
