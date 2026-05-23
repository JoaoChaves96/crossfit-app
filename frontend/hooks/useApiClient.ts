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
 * By default (no options), the hook requires an authenticated token and throws
 * when none is present. It also intercepts 401 responses to trigger logout and
 * redirect to /login.
 *
 * Pass { public: true } to obtain an unauthenticated client for public
 * endpoints (e.g. invite validation). Token is not required in this mode.
 */
export function useApiClient(options?: UseApiClientOptions) {
  const { token, logout } = useAuth();
  const router = useRouter();

  return useMemo(() => {
    const isPublic = options?.public === true;

    if (!isPublic && !token) {
      throw new Error('useApiClient: No token available. User must be authenticated.');
    }

    const client = createApiClient({ token: token ?? undefined });

    const on401 = () => {
      void logout();
      router.replace('/login');
    };

    return wrap401(client, on401);
  }, [token, logout, router, options?.public]);
}
