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
        setCurrentGymIdState(storedGymId);
      } catch (error) {
        console.error('Failed to load gym context from storage:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const setCurrentGymId = async (gymId: string) => {
    await storage.setItem(CURRENT_GYM_ID_KEY, gymId);
    setCurrentGymIdState(gymId);
  };

  return (
    <GymContext.Provider value={{ currentGymId, isLoading, setCurrentGymId }}>
      {children}
    </GymContext.Provider>
  );
}
