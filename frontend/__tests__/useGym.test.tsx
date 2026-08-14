import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { useGym } from '@/hooks/useGym';
import { GymContext, GymContextType, GymProvider } from '@/context/GymContext';
import { AuthContext, AuthContextType } from '@/context/AuthContext';

// switchGym's real implementation is exercised here, over a mocked api
// client and storage, rather than through the fake context the rest of this
// file uses — those tests are about useGym's pass-through, not the switch
// itself.
const mockPost = jest.fn();
jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ post: mockPost }),
}));

const mockSetItem = jest.fn();
jest.mock('@/utils/storage', () => ({
  storage: {
    setItem: (...args: unknown[]) => mockSetItem(...args),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn(),
  },
}));

function buildAuthContext(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: null,
    token: 'old-token',
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(() => Promise.resolve()),
    logout: jest.fn(() => Promise.resolve()),
    ...overrides,
  };
}

function makeRealWrapper(authValue: AuthContextType) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={authValue}>
        <GymProvider>{children}</GymProvider>
      </AuthContext.Provider>
    );
  };
}

function buildGymContext(overrides?: Partial<GymContextType>): GymContextType {
  return {
    currentGymId: 'gym-abc',
    isLoading: false,
    setCurrentGymId: jest.fn(() => Promise.resolve()),
    switchGym: jest.fn(() => Promise.resolve()),
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

  describe('switchGym (real implementation)', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockSetItem.mockResolvedValue(undefined);
    });

    it('stores the re-signed token before moving the local gym id, in that order', async () => {
      // Arrange
      mockPost.mockResolvedValue({ accessToken: 'new-token' });
      const login = jest.fn(() => Promise.resolve());
      const wrapper = makeRealWrapper(buildAuthContext({ login }));
      const { result } = renderHook(() => useGym(), { wrapper });
      await act(async () => {}); // settle the mount read

      // Act
      await act(async () => {
        await result.current.switchGym('gym-b');
      });

      // Assert
      expect(login).toHaveBeenCalledWith('new-token');
      expect(mockSetItem).toHaveBeenCalledWith('current_gym_id', 'gym-b');
      expect(login.mock.invocationCallOrder[0]).toBeLessThan(
        mockSetItem.mock.invocationCallOrder[0]
      );
    });

    it('touches neither the token nor the local gym id when the switch is refused', async () => {
      // Arrange
      mockPost.mockRejectedValue(new Error('Forbidden'));
      const login = jest.fn(() => Promise.resolve());
      const wrapper = makeRealWrapper(buildAuthContext({ login }));
      const { result } = renderHook(() => useGym(), { wrapper });
      await act(async () => {});

      // Act & Assert
      await act(async () => {
        await expect(result.current.switchGym('gym-b')).rejects.toThrow('Forbidden');
      });
      expect(login).not.toHaveBeenCalled();
      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('reports success when only the local write fails, because the session did switch', async () => {
      // Arrange — the token is replaced, then persistence fails. Letting that
      // reject would make the switcher say "Could not switch gym." about the
      // gym the session is now acting in.
      mockPost.mockResolvedValue({ accessToken: 'new-token' });
      mockSetItem.mockRejectedValue(new Error('quota exceeded'));
      const login = jest.fn(() => Promise.resolve());
      const wrapper = makeRealWrapper(buildAuthContext({ login }));
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useGym(), { wrapper });
      await act(async () => {});

      // Act & Assert
      await act(async () => {
        await expect(result.current.switchGym('gym-b')).resolves.toBeUndefined();
      });
      expect(login).toHaveBeenCalledWith('new-token');
      expect(result.current.currentGymId).toBe('gym-b');
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
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
