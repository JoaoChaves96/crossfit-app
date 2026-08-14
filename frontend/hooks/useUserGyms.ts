import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGym } from '@/hooks/useGym';
import { createApiClient } from '@/utils/api-client';
import { components } from '@/types/api.gen';

type UserGym = components['schemas']['UserGymDto'];
type GetUserGymsResponse = components['schemas']['GetUserGymsResponseDto'];

export interface UserGymsState {
  /** Every gym this session may act in. Empty until the fetch resolves. */
  gyms: UserGym[];
  /** The gym the token currently names, so a caller can mark the active row. */
  currentGymId: string | null;
  /**
   * That gym's name, or null until the list arrives. Screens with no schedule
   * response to read a name from — the coach shell — head their menu with this.
   */
  currentGymName: string | null;
  /** False for the common single-gym case: there is nothing to switch between. */
  canSwitch: boolean;
  /** Copy for a refused switch, or null. Cleared on the next attempt. */
  error: string | null;
  /**
   * Switches, and reports whether it took. Never rejects — a caller that wants
   * to dismiss its own UI on success needs the answer synchronously, and
   * reading `error` right after the await would read the previous render's
   * value.
   */
  select: (gymId: string) => Promise<boolean>;
}

/**
 * The gym list and the switch, in one place.
 *
 * Two surfaces offer switching — the athlete's gym menu and the coach screen's
 * inline control — and they used to each own a copy of this fetch, the
 * two-or-more rule, and the failure copy. One hook means a change to any of
 * those cannot land on one surface and miss the other.
 *
 * A successful switch has no message of its own (there is no success role): the
 * caller's screen redrawing with the new gym's data is the confirmation. A
 * refused switch is the one thing worth saying out loud.
 */
export function useUserGyms(): UserGymsState {
  const { token } = useAuth();
  const { currentGymId, switchGym } = useGym();
  const [gyms, setGyms] = useState<UserGym[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // A caller can navigate away before this resolves — no screen blocks
    // navigation on it. `cancelled` stops a late response from setting state on
    // an unmounted component instead of just discarding it.
    let cancelled = false;

    (async () => {
      if (!token) return;
      try {
        const client = createApiClient({ token });
        const data = await client.get<GetUserGymsResponse>('/api/me/gyms');
        if (!cancelled) setGyms(data.gyms ?? []);
      } catch {
        // A failed fetch leaves the switch hidden — a single-gym caller and a
        // caller whose list failed to load look the same, and both are fine.
        if (!cancelled) setGyms([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const select = async (gymId: string): Promise<boolean> => {
    setError(null);
    try {
      await switchGym(gymId);
      return true;
    } catch {
      setError('Could not switch gym.');
      return false;
    }
  };

  return {
    gyms,
    currentGymId: currentGymId ?? null,
    currentGymName: gyms.find((gym) => gym.gymId === currentGymId)?.gymName ?? null,
    canSwitch: gyms.length >= 2,
    error,
    select,
  };
}
