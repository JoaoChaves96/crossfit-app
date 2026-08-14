import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';
import { Space, Status } from '@/constants/design';
import { Text, SegmentedToggle, SelectField, SelectFetchState } from '@/components/cleanink';

type UserGym = components['schemas']['UserGymDto'];
type GetUserGymsResponse = components['schemas']['GetUserGymsResponseDto'];

// Above this many gyms, a segmented track stops reading as a control and
// starts reading as clutter — hand off to the SelectField menu/sheet instead.
const SEGMENTED_TOGGLE_MAX = 3;

/**
 * Lets a caller staffed at more than one gym choose which one their session
 * acts in. Self-hides for the common single-gym case — there is nothing to
 * switch between, so the control would only be noise.
 *
 * A successful switch has no banner of its own (there is no success role):
 * the caller's own screen redrawing with the new gym's data is the
 * confirmation. A refused switch is the one thing this component does say
 * out loud, as quiet meta text rather than an alert.
 */
export function GymSwitcher() {
  const { token } = useAuth();
  const { currentGymId, switchGym } = useGym();
  const [gyms, setGyms] = useState<UserGym[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchGyms = useCallback(async () => {
    if (!token) return;
    try {
      const client = createApiClient({ token });
      const data = await client.get<GetUserGymsResponse>('/api/me/gyms');
      setGyms(data.gyms ?? []);
    } catch {
      // A failed fetch just leaves the switcher hidden — a single-gym caller
      // and a caller whose gym list failed to load look the same, and both
      // are silently fine.
      setGyms([]);
    }
  }, [token]);

  useEffect(() => {
    fetchGyms();
  }, [fetchGyms]);

  const handleSelect = async (gymId: string) => {
    setError(null);
    try {
      await switchGym(gymId);
    } catch {
      setError('Could not switch gym.');
    }
  };

  if (gyms.length < 2) return null;

  return (
    <View testID="gym-switcher" style={{ gap: Space.xs }}>
      {gyms.length <= SEGMENTED_TOGGLE_MAX ? (
        <SegmentedToggle
          options={gyms.map((gym) => ({
            value: gym.gymId,
            label: gym.gymName,
            testID: `gym-switcher-option-${gym.gymId}`,
          }))}
          value={currentGymId ?? ''}
          onChange={handleSelect}
        />
      ) : (
        <SelectField
          label="Gym"
          items={gyms.map((gym) => ({
            id: gym.gymId,
            label: gym.gymName,
            testID: `gym-switcher-option-${gym.gymId}`,
          }))}
          selectedId={currentGymId ?? ''}
          onSelect={handleSelect}
          fetchState={{ status: 'success', data: gyms } as SelectFetchState<UserGym[]>}
        />
      )}
      {error ? (
        <Text size="meta" tone={Status.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
