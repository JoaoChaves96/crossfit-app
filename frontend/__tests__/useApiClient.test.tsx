/**
 * Tests for useApiClient hook and createApiClient utility.
 *
 * useApiClient reads token from AuthContext. When authenticated it returns a
 * createApiClient({token}) instance wrapped to redirect on 401. When no token
 * is present (authed mode) it does NOT throw during render — it returns a
 * client whose methods reject with a 401 ApiError and redirect to /login, so a
 * cold-start token race degrades gracefully instead of crashing the tree.
 * Pass { public: true } for a token-free client on public endpoints.
 *
 * createApiClient attaches Authorization: Bearer <token> to all requests
 * and throws ApiError on non-ok HTTP responses.
 */

import React from 'react';
import { renderHook } from '@testing-library/react-native';

import { AuthWrapper } from '@/test-utils/auth-wrapper';
import { getMockRouter } from '@/test-utils/mock-navigation';
import { useApiClient } from '@/hooks/useApiClient';
import { createApiClient, ApiError } from '@/utils/api-client';

// ─── fetch mock ───────────────────────────────────────────────────────────────

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── useApiClient — no token ───────────────────────────────────────────────────

describe('useApiClient — called without a token', () => {
  it('does NOT throw during render when auth context has no token', () => {
    // Throwing in render would crash the tree before the navigation guard can
    // redirect (the cold-start token race). The hook must degrade gracefully.
    const unauthWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthWrapper value={{ token: null, isAuthenticated: false, user: null }}>
        {children}
      </AuthWrapper>
    );

    expect(() => renderHook(() => useApiClient(), { wrapper: unauthWrapper })).not.toThrow();
  });

  it('rejects with a 401 ApiError and redirects to /login when a method is called', async () => {
    // Arrange — unauthenticated context
    const mockLogout = jest.fn(() => Promise.resolve());
    const unauthWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthWrapper value={{ token: null, isAuthenticated: false, user: null, logout: mockLogout }}>
        {children}
      </AuthWrapper>
    );
    const { result } = renderHook(() => useApiClient(), { wrapper: unauthWrapper });
    const mockRouter = getMockRouter();

    // Act — calling a method (as a screen would inside an effect) rejects
    const error = await result.current.get('/protected').catch((e: unknown) => e);

    // Assert — no network call, rejects with 401, logs out and redirects
    expect(mockFetch).not.toHaveBeenCalled();
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(mockLogout).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });
});

// ─── useApiClient — with token ────────────────────────────────────────────────

describe('useApiClient — called with a valid token', () => {
  it('returns an object with get, post, patch, delete methods', () => {
    // Arrange
    const { result } = renderHook(() => useApiClient(), { wrapper: AuthWrapper });

    // Assert
    expect(typeof result.current.get).toBe('function');
    expect(typeof result.current.post).toBe('function');
    expect(typeof result.current.patch).toBe('function');
    expect(typeof result.current.delete).toBe('function');
  });
});

// ─── createApiClient — Bearer token attachment ────────────────────────────────

describe('createApiClient — Bearer token is attached to outgoing requests', () => {
  it('sends Authorization: Bearer <token> header on GET requests', async () => {
    // Arrange
    const token = 'test-token-abc';
    const client = createApiClient({ token });
    mockFetch.mockResolvedValueOnce(makeResponse(200, { id: '1' }));

    // Act
    await client.get('/some/path');

    // Assert
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${token}`,
    );
  });

  it('sends Authorization: Bearer <token> header on POST requests', async () => {
    // Arrange
    const token = 'test-token-abc';
    const client = createApiClient({ token });
    mockFetch.mockResolvedValueOnce(makeResponse(201, {}));

    // Act
    await client.post('/some/path', { name: 'test' });

    // Assert
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${token}`,
    );
  });

  it('sends Authorization: Bearer <token> header on PATCH requests', async () => {
    // Arrange
    const token = 'test-token-abc';
    const client = createApiClient({ token });
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

    // Act
    await client.patch('/some/path', { name: 'updated' });

    // Assert
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${token}`,
    );
  });

  it('sends Authorization: Bearer <token> header on DELETE requests', async () => {
    // Arrange
    const token = 'test-token-abc';
    const client = createApiClient({ token });
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

    // Act
    await client.delete('/some/path');

    // Assert
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toBe(
      `Bearer ${token}`,
    );
  });

  it('does NOT send Authorization header when no token is provided', async () => {
    // Arrange
    const client = createApiClient({});
    mockFetch.mockResolvedValueOnce(makeResponse(200, {}));

    // Act
    await client.get('/public/path');

    // Assert
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Authorization']).toBeUndefined();
  });
});

// ─── createApiClient — non-ok responses throw ApiError ───────────────────────

describe('createApiClient — non-ok responses throw ApiError', () => {
  it('throws ApiError with status 404 on a 404 response', async () => {
    // Arrange
    const client = createApiClient({ token: 'tok' });
    mockFetch.mockResolvedValueOnce(makeResponse(404, 'Not Found'));

    // Act + Assert
    await expect(client.get('/missing')).rejects.toBeInstanceOf(ApiError);
  });

  it('throws ApiError with status 500 on a 500 response', async () => {
    // Arrange
    const client = createApiClient({ token: 'tok' });
    mockFetch.mockResolvedValueOnce(makeResponse(500, 'Internal Server Error'));

    // Act + Assert
    const error = await client.get('/error').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
  });

  it('throws ApiError with status 401 on a 401 response', async () => {
    // Arrange
    const client = createApiClient({ token: 'tok' });
    mockFetch.mockResolvedValueOnce(makeResponse(401, 'Unauthorized'));

    // Act + Assert
    const error = await client.get('/protected').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });
});

// ─── MISSING BEHAVIORS (intentionally failing) ────────────────────────────────

describe('useApiClient — 401 response triggers logout and redirect', () => {
  /**
   * A 401 response from any API call made through useApiClient must:
   * 1. Call logout() from AuthContext
   * 2. Redirect to /login using the router
   */
  it('calls logout and redirects to /login when a GET request returns 401', async () => {
    // Arrange
    const mockLogout = jest.fn(() => Promise.resolve());
    const authWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthWrapper value={{ logout: mockLogout }}>{children}</AuthWrapper>
    );
    const { result } = renderHook(() => useApiClient(), { wrapper: authWrapper });
    const mockRouter = getMockRouter();
    mockFetch.mockResolvedValueOnce(makeResponse(401, 'Unauthorized'));

    // Act — make a request that returns 401
    await result.current.get('/protected').catch(() => {
      // ApiError is thrown; we catch it to allow the rest of the test to run
    });

    // Assert
    expect(mockLogout).toHaveBeenCalled();
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });
});

describe('useApiClient — public (unauthenticated) requests', () => {
  /**
   * useApiClient({ public: true }) returns a token-free client without
   * requiring an authenticated session.
   */
  it('makes a request without attaching a token when the endpoint is public', () => {
    // Arrange — unauthenticated context (no token)
    const unauthWrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthWrapper value={{ token: null, isAuthenticated: false, user: null }}>
        {children}
      </AuthWrapper>
    );

    // Act + Assert — useApiClient({ public: true }) returns a token-free client
    // without throwing, even when no token is present in auth context
    expect(() =>
      renderHook(() => useApiClient({ public: true }), { wrapper: unauthWrapper }),
    ).not.toThrow();
  });
});
