import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useGym } from '@/hooks/useGym';
import { GymContext, GymContextType } from '@/context/GymContext';

function buildGymContext(overrides?: Partial<GymContextType>): GymContextType {
  return {
    currentGymId: 'gym-abc',
    isLoading: false,
    setCurrentGymId: jest.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function makeWrapper(contextValue: GymContextType) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <GymContext.Provider value={contextValue}>{children}</GymContext.Provider>;
  };
}

describe('useGym', () => {
  describe('when inside GymProvider', () => {
    it('returns the current gym id from context', () => {
      // Arrange
      const ctx = buildGymContext({ currentGymId: 'gym-xyz' });
      const wrapper = makeWrapper(ctx);

      // Act
      const { result } = renderHook(() => useGym(), { wrapper });

      // Assert
      expect(result.current.currentGymId).toBe('gym-xyz');
    });

    it('returns isLoading from context', () => {
      // Arrange
      const ctx = buildGymContext({ isLoading: true });
      const wrapper = makeWrapper(ctx);

      // Act
      const { result } = renderHook(() => useGym(), { wrapper });

      // Assert
      expect(result.current.isLoading).toBe(true);
    });

    it('updates currentGymId in context when setCurrentGymId is called', async () => {
      // Arrange
      const setCurrentGymId = jest.fn(() => Promise.resolve());
      const ctx = buildGymContext({ currentGymId: 'gym-old', setCurrentGymId });
      const wrapper = makeWrapper(ctx);

      // Act
      const { result } = renderHook(() => useGym(), { wrapper });
      await act(async () => {
        await result.current.setCurrentGymId('gym-new');
      });

      // Assert
      expect(setCurrentGymId).toHaveBeenCalledWith('gym-new');
    });

    it('exposes setCurrentGymId as a function', () => {
      // Arrange
      const ctx = buildGymContext();
      const wrapper = makeWrapper(ctx);

      // Act
      const { result } = renderHook(() => useGym(), { wrapper });

      // Assert
      expect(typeof result.current.setCurrentGymId).toBe('function');
    });
  });

  describe('when used outside GymProvider', () => {
    it('throws an error', () => {
      // Arrange — no wrapper provided, context value will be undefined

      // Act & Assert
      expect(() => renderHook(() => useGym())).toThrow(
        'useGym must be used within GymProvider'
      );
    });
  });
});
