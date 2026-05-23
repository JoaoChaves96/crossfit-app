/**
 * Tests for useAuth hook and AuthProvider (AuthContext.tsx).
 *
 * useAuth is a thin context accessor — all login/logout/session-restore/role
 * logic lives in AuthProvider. Tests exercise the provider via renderHook
 * with AuthProvider as wrapper, reading state through useAuth.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { AuthProvider } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

// ─── JWT fixture factory ──────────────────────────────────────────────────────

function base64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url(payload);
  return `${header}.${body}.fakesignature`;
}

const FUTURE_EXP = Math.floor(Date.now() / 1000) + 3600;
const PAST_EXP = Math.floor(Date.now() / 1000) - 3600;

function validToken(overrides: Record<string, unknown> = {}): string {
  return makeJwt({
    sub: 'user-123',
    email: 'athlete@gym.com',
    role: 'athlete',
    gymId: 'gym-abc',
    exp: FUTURE_EXP,
    ...overrides,
  });
}

function expiredToken(): string {
  return makeJwt({
    sub: 'user-123',
    email: 'athlete@gym.com',
    role: 'athlete',
    gymId: 'gym-abc',
    exp: PAST_EXP,
  });
}

function tokenWithoutSub(): string {
  return makeJwt({
    email: 'athlete@gym.com',
    role: 'athlete',
    gymId: 'gym-abc',
    exp: FUTURE_EXP,
  });
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;
const mockDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItemAsync.mockResolvedValue(null);
  mockSetItemAsync.mockResolvedValue(undefined);
  mockDeleteItemAsync.mockResolvedValue(undefined);
});

// ─── useAuth outside provider ─────────────────────────────────────────────────

describe('useAuth — used outside AuthProvider', () => {
  it('throws an error describing missing provider', () => {
    // Arrange — no wrapper, hook is called outside AuthProvider
    // Act + Assert
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within AuthProvider',
    );
  });
});

// ─── AuthProvider — initial loading state ─────────────────────────────────────

describe('AuthProvider — initial state', () => {
  it('starts in loading state before storage resolves', () => {
    // Arrange — getItemAsync never resolves during this check
    let resolveStorage!: (value: string | null) => void;
    mockGetItemAsync.mockReturnValue(new Promise<string | null>((res) => { resolveStorage = res; }));

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert — isLoading is true while storage has not yet returned
    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();

    // Cleanup — let the promise resolve so the component can unmount cleanly
    act(() => { resolveStorage(null); });
  });

  it('sets isLoading to false after storage resolves with no token', async () => {
    // Arrange
    mockGetItemAsync.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('AuthProvider — login', () => {
  it('stores the token in secure storage', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const token = validToken();

    // Act
    await act(async () => { await result.current.login(token); });

    // Assert
    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_token', token);
  });

  it('sets token state to the provided token', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const token = validToken();

    // Act
    await act(async () => { await result.current.login(token); });

    // Assert
    expect(result.current.token).toBe(token);
  });

  it('sets user state from decoded JWT claims', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const token = validToken();

    // Act
    await act(async () => { await result.current.login(token); });

    // Assert
    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'athlete@gym.com',
      role: 'athlete',
      gymId: 'gym-abc',
    });
  });

  it('sets isAuthenticated to true after login', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Act
    await act(async () => { await result.current.login(validToken()); });

    // Assert
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('correctly extracts the role from JWT claims', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const token = validToken({ role: 'gym_owner' });

    // Act
    await act(async () => { await result.current.login(token); });

    // Assert
    expect(result.current.user?.role).toBe('gym_owner');
  });

  it('sets role to null when JWT has no role claim', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const tokenWithoutRole = makeJwt({
      sub: 'user-123',
      email: 'athlete@gym.com',
      gymId: 'gym-abc',
      exp: FUTURE_EXP,
    });

    // Act
    await act(async () => { await result.current.login(tokenWithoutRole); });

    // Assert
    expect(result.current.user?.role).toBeNull();
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('AuthProvider — logout', () => {
  it('removes the token from secure storage', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.login(validToken()); });

    // Act
    await act(async () => { await result.current.logout(); });

    // Assert
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('clears token state', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.login(validToken()); });

    // Act
    await act(async () => { await result.current.logout(); });

    // Assert
    expect(result.current.token).toBeNull();
  });

  it('clears user state', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.login(validToken()); });

    // Act
    await act(async () => { await result.current.logout(); });

    // Assert
    expect(result.current.user).toBeNull();
  });

  it('sets isAuthenticated to false after logout', async () => {
    // Arrange
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.login(validToken()); });

    // Act
    await act(async () => { await result.current.logout(); });

    // Assert
    expect(result.current.isAuthenticated).toBe(false);
  });
});

// ─── session restore ──────────────────────────────────────────────────────────

describe('AuthProvider — session restore on mount', () => {
  it('restores token and user when a valid token exists in storage', async () => {
    // Arrange
    const token = validToken();
    mockGetItemAsync.mockResolvedValue(token);

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(result.current.token).toBe(token);
    expect(result.current.user).toEqual({
      id: 'user-123',
      email: 'athlete@gym.com',
      role: 'athlete',
      gymId: 'gym-abc',
    });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('reads the token from storage using the key auth_token', async () => {
    // Arrange
    mockGetItemAsync.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert
    expect(mockGetItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('clears state and removes storage entry when stored token is expired', async () => {
    // Arrange — expired token in storage
    mockGetItemAsync.mockResolvedValue(expiredToken());

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert — state is cleared, token removed from storage
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('clears state and removes storage entry when stored token has no sub claim', async () => {
    // Arrange — invalid token (missing sub) in storage
    mockGetItemAsync.mockResolvedValue(tokenWithoutSub());

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Assert — treated as invalid, state cleared
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('clears state without crashing when stored token is malformed garbage', async () => {
    // Arrange — not a JWT at all
    mockGetItemAsync.mockResolvedValue('not.a.valid.jwt.string');

    // Act
    const { result } = renderHook(() => useAuth(), { wrapper });

    // Assert — does not throw, resolves to unauthenticated
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
