import { useContext } from 'react';
import { GymContext, GymContextType } from '@/context/GymContext';

export function useGym(): GymContextType {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error('useGym must be used within GymProvider');
  }
  return context;
}
