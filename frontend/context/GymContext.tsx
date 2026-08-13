import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { storage } from '@/utils/storage';

const CURRENT_GYM_ID_KEY = 'current_gym_id';

export interface GymContextType {
  currentGymId: string | null;
  isLoading: boolean;
  setCurrentGymId: (gymId: string) => Promise<void>;
}

export const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
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
    // makes a failed write cost only persistence. The rejection still
    // propagates so callers can decide what to say about it.
    setCurrentGymIdState(gymId);
    await storage.setItem(CURRENT_GYM_ID_KEY, gymId);
  };

  return (
    <GymContext.Provider value={{ currentGymId, isLoading, setCurrentGymId }}>
      {children}
    </GymContext.Provider>
  );
}
