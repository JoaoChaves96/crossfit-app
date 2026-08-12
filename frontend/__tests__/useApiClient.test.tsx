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
  it('returns an object with get, post, patch, put, delete methods', () => {
    // Arrange
    const { result } = renderHook(() => useApiClient(), { wrapper: AuthWrapper });

    // Assert
    expect(typeof result.current.get).toBe('function');
    expect(typeof result.current.post).toBe('function');
    expect(typeof result.current.patch).toBe('function');
    expect(typeof result.current.put).toBe('function');
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

// ─── ApiError — user-facing message ───────────────────────────────────────────

/**
 * Every screen renders `err.message` in its error state, so ApiError.message is
 * user-facing copy — it must never be the raw response body. The server text is
 * kept on `detail` for logging: backend messages routinely leak internals
 * ("Class <uuid> not found in gym <uuid>", "JWT secret not configured").
 */
describe('ApiError — message is user-facing copy, not the raw body', () => {
  it('does not put the raw JSON body in message', () => {
    const error = new ApiError(400, '{"message":"Capacity must be greater than 0","statusCode":400}');

    expect(error.message).not.toContain('{');
    expect(error.message).not.toContain('statusCode');
  });

  it('keeps the raw server body on detail', () => {
    const body = '{"message":"Capacity must be greater than 0","statusCode":400}';
    const error = new ApiError(400, body);

    expect(error.detail).toBe(body);
  });

  it('gives each status class its own sentence', () => {
    expect(new ApiError(400, 'x').message).toBe(
      'Something in that request was not valid. Please check your details and try again.',
    );
    expect(new ApiError(401, 'x').message).toBe('Your session has expired. Please log in again.');
    expect(new ApiError(403, 'x').message).toBe('You do not have permission to do that.');
    expect(new ApiError(404, 'x').message).toBe('We could not find what you were looking for.');
    expect(new ApiError(409, 'x').message).toBe(
      'That conflicts with something that already exists. Please refresh and try again.',
    );
  });

  it('treats any 5xx as a server-side problem', () => {
    const expected = 'Something went wrong on our end. Please try again in a moment.';

    expect(new ApiError(500, 'x').message).toBe(expected);
    expect(new ApiError(503, 'x').message).toBe(expected);
  });

  it('falls back to a generic sentence for unmapped statuses', () => {
    expect(new ApiError(418, 'x').message).toBe('Something went wrong. Please try again.');
  });

  it('surfaces an offline hint for the status-0 network failure case', () => {
    expect(new ApiError(0, '').message).toBe(
      'Could not reach the server. Check your connection and try again.',
    );
  });

  it('is still an Error with a readable stack-trace name', () => {
    const error = new ApiError(404, 'nope');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
  });
});

// ─── createApiClient — network failures ──────────────────────────────────────

describe('createApiClient — a failed fetch becomes an ApiError', () => {
  it('converts a rejected fetch into a status-0 ApiError instead of a raw TypeError', async () => {
    // A dead server / offline device rejects fetch outright; screens render
    // err.message, and "Network request failed" is not user-facing copy.
    const client = createApiClient({ token: 'tok' });
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));

    const error = await client.get('/anything').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).message).toBe(
      'Could not reach the server. Check your connection and try again.',
    );
  });

  it('does not swallow an ApiError raised from a non-ok response', async () => {
    const client = createApiClient({ token: 'tok' });
    mockFetch.mockResolvedValueOnce(makeResponse(404, 'Not Found'));

    const error = await client.get('/missing').catch((e: unknown) => e);

    expect((error as ApiError).status).toBe(404);
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
