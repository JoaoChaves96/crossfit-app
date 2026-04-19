import { useAuth } from './useAuth';
import { useGym } from './useGym';
import { createApiClient } from '@/utils/api-client';
import { useMemo } from 'react';

/**
 * Hook that provides an authenticated API client.
 * Automatically attaches userId and gymId from auth/gym context.
 */
export function useApiClient() {
  const { userId } = useAuth();
  const { currentGymId } = useGym();

  return useMemo(() => {
    if (!userId) {
      throw new Error('useApiClient: No userId available. User must be authenticated.');
    }
    if (!currentGymId) {
      throw new Error('useApiClient: No gym selected. Gym context must be set.');
    }
    return createApiClient({ userId, gymId: currentGymId });
  }, [userId, currentGymId]);
}
