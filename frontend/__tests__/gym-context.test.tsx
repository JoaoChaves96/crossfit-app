import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { GymProvider } from '@/context/GymContext';
import { useGym } from '@/hooks/useGym';

// The real provider is what these tests are about — useGym.test.tsx covers the
// hook against a mocked context and so never exercises the persistence order.
const mockSetItem = jest.fn();
const mockGetItem = jest.fn();

jest.mock('@/utils/storage', () => ({
  storage: {
    setItem: (...args: unknown[]) => mockSetItem(...args),
    getItem: (...args: unknown[]) => mockGetItem(...args),
    removeItem: jest.fn(),
  },
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  return <GymProvider>{children}</GymProvider>;
}

function renderProvider() {
  return renderHook(() => useGym(), { wrapper: Wrapper });
}

// Lets the mount read resolve, so a test asserting on a later write is not
// really asserting on the race between the two.
async function settleMount() {
  await act(async () => {});
}

describe('GymProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks leaves implementations in place, so a rejection set by one
    // test would otherwise leak into the next.
    mockSetItem.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
  });

  it('exposes the gym it was given and persists it', async () => {
    const { result } = renderProvider();
    await settleMount();

    await act(async () => {
      await result.current.setCurrentGymId('gym-1');
    });

    expect(result.current.currentGymId).toBe('gym-1');
    expect(mockSetItem).toHaveBeenCalledWith('current_gym_id', 'gym-1');
  });

  it('does not let the mount read clobber a gym set while it was in flight', async () => {
    // The stored value is what a cold start would find; the caller sets a gym
    // before that read resolves, which is what invite acceptance does.
    mockGetItem.mockResolvedValue(null);

    const { result } = renderProvider();

    await act(async () => {
      await result.current.setCurrentGymId('gym-1');
    });

    expect(result.current.currentGymId).toBe('gym-1');
  });

  it('reads the persisted gym on mount', async () => {
    mockGetItem.mockResolvedValue('gym-stored');

    const { result } = renderProvider();

    await act(async () => {});

    expect(result.current.currentGymId).toBe('gym-stored');
    expect(result.current.isLoading).toBe(false);
  });

  it('keeps the gym for this session when persistence fails', async () => {
    mockSetItem.mockRejectedValue(new Error('storage unavailable'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderProvider();
    await settleMount();

    // The rejection does NOT reach the caller. Every writer gets here after a
    // server-side commit, so a caller that surfaced this would report a
    // committed operation as failed — see the provider for the three ways that
    // went wrong.
    await act(async () => {
      await expect(result.current.setCurrentGymId('gym-1')).resolves.toBeUndefined();
    });

    // What a failed write costs is survival across a restart, not the session.
    // A screen with no gym issues no requests at all, so the alternative
    // ordering left the user staring at an empty gym — the exact dead end
    // writing the gym on invite acceptance existed to remove.
    expect(result.current.currentGymId).toBe('gym-1');

    // Absorbed is not unnoticed.
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('persisting it failed'),
      expect.any(Error),
    );
    consoleError.mockRestore();
  });
});
