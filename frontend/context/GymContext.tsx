import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { storage } from '@/utils/storage';
import { createApiClient } from '@/utils/api-client';
import { AuthContext } from '@/context/AuthContext';
import { components } from '@/types/api.gen';

type LoginResponse = components['schemas']['LoginResponseDto'];

const CURRENT_GYM_ID_KEY = 'current_gym_id';

export interface GymContextType {
  currentGymId: string | null;
  isLoading: boolean;
  setCurrentGymId: (gymId: string) => Promise<void>;
  switchGym: (gymId: string) => Promise<void>;
}

export const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const [currentGymId, setCurrentGymIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load currentGymId from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const storedGymId = await storage.getItem(CURRENT_GYM_ID_KEY);
        // Do not clobber a gym set while this read was in flight. The read is
        // several microtasks long, so a caller that sets a gym early — an
        // invite accepted on a cold start — would otherwise have it replaced by
        // whatever storage held before, usually null.
        setCurrentGymIdState((current) => current ?? storedGymId);
      } catch (error) {
        console.error('Failed to load gym context from storage:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setCurrentGymId = async (gymId: string) => {
    // In-memory first, persistence second. Awaiting the write before setting
    // state meant a storage failure cost the caller the gym entirely, not just
    // its survival across a restart — and a screen with no gym issues no
    // requests at all, which reads to the user as an empty gym. This order
    // makes a failed write cost only persistence.
    setCurrentGymIdState(gymId);

    // That persistence failure is absorbed here rather than propagated, because
    // no caller wants it. Every writer reaches this line *after* a server-side
    // commit — a login, an accepted invite, a created gym, a re-signed
    // gym-context token — so surfacing the rejection reports a committed
    // operation as failed:
    //
    //   - gym-setup.tsx ran this before creating spaces and class types, so a
    //     rejection left the gym committed with neither, and retrying answered
    //     409 under One Gym Per Owner. Unrecoverable from the wizard. That call
    //     now also comes last, so ordering and this catch each cover it.
    //   - login.tsx skipped its routeForRole and showed "Something went wrong"
    //     over an already-stored token.
    //   - switchGym said "Could not switch gym." about a gym it had already
    //     switched into.
    //
    // Invite acceptance keeps its own catch on top of this one: its bad outcome
    // is the only unrepairable one, and ordering cannot save it.
    //
    // What a failed write costs is survival across a restart: the gym is
    // re-read from the token's claims on the next login. Nothing to tell the
    // user about. This only rejects on native anyway — utils/storage swallows
    // localStorage failures itself — so the two platforms now agree.
    try {
      await storage.setItem(CURRENT_GYM_ID_KEY, gymId);
    } catch (error) {
      console.error(
        '[gym-context] gym set for this session, but persisting it failed; a restart will not keep it',
        error,
      );
    }
  };

  /**
   * Switch which gym this session acts in.
   *
   * setCurrentGymId alone only writes local storage, which is why pointing it
   * at a second gym used to produce 403s rather than a switch: the backend
   * authorizes against the token's gymId claim (GymOwnershipGuard), not against
   * this context. The re-signed token is the actual switch; the local id keeps
   * the choice across reloads.
   *
   * Once the token is replaced the session has switched, so a failure of the
   * local write after that point costs persistence, not the switch — letting it
   * propagate would make the switcher say "Could not switch gym." about a gym it
   * is now acting in. setCurrentGymId absorbs that itself, so there is nothing
   * to catch here. A rejection from the POST or from login still propagates:
   * those really are failed switches.
   */
  const switchGym = async (gymId: string): Promise<void> => {
    const client = createApiClient({ token: auth?.token });
    const { accessToken } = await client.post<LoginResponse>(
      '/api/auth/gym-context',
      { gymId },
    );
    await auth?.login(accessToken);
    await setCurrentGymId(gymId);
  };

  return (
    <GymContext.Provider value={{ currentGymId, isLoading, setCurrentGymId, switchGym }}>
      {children}
    </GymContext.Provider>
  );
}
