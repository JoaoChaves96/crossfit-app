import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { STATE_NEXT_MAP, STATE_LABEL } from './classStates';

type ClassDetail = components['schemas']['ClassScheduleItemDto'];
type ManuallyTransitionDto = components['schemas']['ManuallyTransitionClassStateDto'];
type ManuallyTransitionResponse = components['schemas']['ManuallyTransitionClassStateResponseDto'];

interface UseClassTransitionParams {
  classDetail: ClassDetail | null;
  token: string | null;
  currentGymId: string | null;
  classId: string | undefined;
  onTransitionSuccess: () => void;
}

interface UseClassTransitionResult {
  isTransitioning: boolean;
  handleTransition: () => void;
}

export function useClassTransition({
  classDetail,
  token,
  currentGymId,
  classId,
  onTransitionSuccess,
}: UseClassTransitionParams): UseClassTransitionResult {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTransition = useCallback(() => {
    if (!classDetail || !token || !currentGymId || !classId) return;
    const nextState = STATE_NEXT_MAP[classDetail.state];
    if (!nextState) return;

    Alert.alert(
      'Advance State',
      `Move class to "${STATE_LABEL[nextState]}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsTransitioning(true);
            try {
              const client = createApiClient({ token });
              const body: ManuallyTransitionDto = {
                classId,
                targetState: nextState,
              };
              await client.post<ManuallyTransitionResponse>(
                `/api/gyms/${currentGymId}/classes/${classId}/transition`,
                body as unknown as Record<string, unknown>
              );
              onTransitionSuccess();
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Transition failed';
              Alert.alert('Error', msg);
            } finally {
              setIsTransitioning(false);
            }
          },
        },
      ]
    );
  }, [classDetail, token, currentGymId, classId, onTransitionSuccess]);

  return { isTransitioning, handleTransition };
}
