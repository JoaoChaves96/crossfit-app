import { useAuth } from './useAuth';
import { createApiClient } from '@/utils/api-client';
import { useMemo } from 'react';

/**
 * Hook that provides an authenticated API client.
 * Automatically attaches the Bearer token from auth context.
 */
export function useApiClient() {
  const { token } = useAuth();

  return useMemo(() => {
    if (!token) {
      throw new Error('useApiClient: No token available. User must be authenticated.');
    }
    return createApiClient({ token });
  }, [token]);
}
