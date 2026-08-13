import { useCallback, useState } from 'react';
import { showConfirm, showError } from '@/utils/alert';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { STATE_NEXT_MAP, STATE_LABEL, type ClassState } from './classStates';

type ManuallyTransitionDto = components['schemas']['ManuallyTransitionClassStateDto'];
type ManuallyTransitionResponse = components['schemas']['ManuallyTransitionClassStateResponseDto'];

interface UseClassTransitionParams {
  /**
   * Current lifecycle state, or null while it is unknown. Deliberately the state
   * alone rather than a whole class DTO: the coach screen is driven by route
   * params and never holds one, and the state is all the transition needs.
   */
  state: ClassState | null;
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
  state,
  token,
  currentGymId,
  classId,
  onTransitionSuccess,
}: UseClassTransitionParams): UseClassTransitionResult {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleTransition = useCallback(() => {
    if (!state || !token || !currentGymId || !classId) return;
    const nextState = STATE_NEXT_MAP[state];
    if (!nextState) return;

    // `showConfirm`, never `Alert.alert`: react-native-web's Alert is a literal
    // no-op (`static alert() {}`), so the owner's lifecycle control did nothing
    // whatsoever on web — no dialog, no request, no error. The confirm button
    // carries an explicit `default` style because that is what showConfirm's web
    // branch looks for when choosing which handler window.confirm runs.
    showConfirm(
      'Advance State',
      `Move class to "${STATE_LABEL[nextState]}"?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Confirm',
          style: 'default',
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
              showError('Error', msg);
            } finally {
              setIsTransitioning(false);
            }
          },
        },
      ]
    );
  }, [state, token, currentGymId, classId, onTransitionSuccess]);

  return { isTransitioning, handleTransition };
}
