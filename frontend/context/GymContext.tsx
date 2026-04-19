import React, { createContext, ReactNode, useState } from 'react';

export interface GymContextType {
  currentGymId: string | null;
  setCurrentGymId: (gymId: string) => void;
}

export const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: ReactNode }) {
  // TODO: Persist gym preference after gym switcher is implemented
  // For now, this is a simple in-memory store.
  const [currentGymId, setCurrentGymId] = useState<string | null>(null);

  return (
    <GymContext.Provider value={{ currentGymId, setCurrentGymId }}>
      {children}
    </GymContext.Provider>
  );
}
