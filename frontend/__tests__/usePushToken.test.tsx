/**
 * Tests for usePushToken hook.
 *
 * Verifies push notification permission request, token retrieval,
 * and backend registration.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { AuthWrapper } from '@/test-utils/auth-wrapper';
import { usePushToken } from '@/hooks/usePushToken';

// ─── Mock API client ─────────────────────────────────────────────────────────

const mockPost = jest.fn();

const mockApiClient = {
  get: jest.fn(),
  post: mockPost,
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/hooks/useApiClient', () => ({
  useApiClient: () => mockApiClient,
}));

// ─── Mock expo-notifications ─────────────────────────────────────────────────

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

// ─── Mock expo-device ────────────────────────────────────────────────────────

jest.mock('expo-device', () => ({
  isDevice: true,
}));

// ─── Wrapper ─────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthWrapper>{children}</AuthWrapper>;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (Device as { isDevice: boolean }).isDevice = true;
});

describe('usePushToken — on physical device with granted permissions', () => {
  beforeEach(() => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[abc123]',
    });
    mockPost.mockResolvedValue({ id: 'token-1', token: 'ExponentPushToken[abc123]', platform: 'ios', createdAt: '2026-05-23' });
  });

  it('retrieves the push token', async () => {
    // Act
    const { result } = renderHook(() => usePushToken(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.pushToken).toBe('ExponentPushToken[abc123]'));
  });

  it('sets permission status to granted', async () => {
    // Act
    const { result } = renderHook(() => usePushToken(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.permissionStatus).toBe('granted'));
  });

  it('registers the token with the backend', async () => {
    // Arrange
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });

    // Act
    renderHook(() => usePushToken(), { wrapper });

    // Assert
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith(
      '/api/me/notifications/push-token',
      { token: 'ExponentPushToken[abc123]', platform: 'ios' },
    ));

    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
  });
});

describe('usePushToken — permission not yet granted', () => {
  it('requests permissions when not already granted', async () => {
    // Arrange
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[xyz789]',
    });
    mockPost.mockResolvedValue({ id: 'token-2' });

    // Act
    const { result } = renderHook(() => usePushToken(), { wrapper });

    // Assert
    await waitFor(() => expect(Notifications.requestPermissionsAsync).toHaveBeenCalled());
    await waitFor(() => expect(result.current.pushToken).toBe('ExponentPushToken[xyz789]'));
  });

  it('does not get token when permissions are denied', async () => {
    // Arrange
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    // Act
    const { result } = renderHook(() => usePushToken(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.permissionStatus).toBe('denied'));
    expect(result.current.pushToken).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockPost).not.toHaveBeenCalled();
  });
});

describe('usePushToken — not a physical device', () => {
  it('does not request permissions or register token on emulator', async () => {
    // Arrange
    (Device as { isDevice: boolean }).isDevice = false;

    // Act
    const { result } = renderHook(() => usePushToken(), { wrapper });

    // Assert — give it time to potentially run
    await new Promise((r) => setTimeout(r, 50));
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(result.current.pushToken).toBeNull();
    expect(result.current.permissionStatus).toBeNull();
  });
});
