import { useAuth } from './useAuth';
import { createApiClient, ApiError } from '@/utils/api-client';
import { useMemo } from 'react';
import { useRouter } from 'expo-router';

export interface UseApiClientOptions {
  public?: boolean;
}

type ApiClient = ReturnType<typeof createApiClient>;

function wrap401<T extends ApiClient>(client: T, on401: () => void): T {
  const wrapped: Record<string, unknown> = {};

  for (const method of ['get', 'post', 'patch', 'delete'] as const) {
    const original = client[method] as (...args: unknown[]) => Promise<unknown>;
    wrapped[method] = async (...args: unknown[]) => {
      try {
        return await original(...args);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          on401();
        }
        throw err;
      }
    };
  }

  return wrapped as T;
}

/**
 * Hook that provides an API client.
 *
 * By default (no options), the hook expects an authenticated token. If none is
 * present, it returns a client whose methods reject when *called* (and redirect
 * to /login) rather than throwing during render — throwing in render crashes the
 * whole tree before the navigation guard's effect can redirect. This matters on
 * a cold start, where the router may restore an authed route and mount a screen
 * before AuthContext has finished restoring the token. It also intercepts 401
 * responses to trigger logout and redirect to /login.
 *
 * Pass { public: true } to obtain an unauthenticated client for public
 * endpoints (e.g. invite validation). Token is not required in this mode.
 */
export function useApiClient(options?: UseApiClientOptions) {
  const { token, logout } = useAuth();
  const router = useRouter();

  return useMemo(() => {
    const isPublic = options?.public === true;

    const on401 = () => {
      void logout();
      router.replace('/login');
    };

    // No token on an authed client: don't throw during render. Return a client
    // whose methods reject at call time and bounce to /login. Callers fetch
    // inside effects/handlers with try/catch, so this degrades gracefully
    // instead of crashing the render tree.
    if (!isPublic && !token) {
      const reject = async () => {
        on401();
        throw new ApiError(401, 'Not authenticated');
      };
      return {
        get: reject,
        post: reject,
        patch: reject,
        delete: reject,
      } as ApiClient;
    }

    const client = createApiClient({ token: token ?? undefined });

    return wrap401(client, on401);
  }, [token, logout, router, options?.public]);
}
