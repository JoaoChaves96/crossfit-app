import { renderHook, act, waitFor } from '@testing-library/react-native';

const mockGet = jest.fn();
jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet }),
}));

let mockToken: string | null = 'test-token';
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: mockToken }),
}));

const mockSwitchGym = jest.fn();
jest.mock('@/hooks/useGym', () => ({
  useGym: () => ({
    currentGymId: 'gym-a',
    isLoading: false,
    setCurrentGymId: jest.fn(),
    switchGym: mockSwitchGym,
  }),
}));

import { useUserGyms } from '@/hooks/useUserGyms';

const TWO_GYMS = [
  { gymId: 'gym-a', gymName: 'Box A', role: 'athlete' },
  { gymId: 'gym-b', gymName: 'Box B', role: 'athlete' },
];

describe('useUserGyms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToken = 'test-token';
    mockSwitchGym.mockResolvedValue(undefined);
  });

  it('loads the gyms this session may act in', async () => {
    mockGet.mockResolvedValue({ gyms: TWO_GYMS });

    const { result } = renderHook(() => useUserGyms());

    await waitFor(() => expect(result.current.gyms).toHaveLength(2));
    expect(mockGet).toHaveBeenCalledWith('/api/me/gyms');
    expect(result.current.currentGymId).toBe('gym-a');
    expect(result.current.canSwitch).toBe(true);
  });

  it('cannot switch with a single gym', async () => {
    mockGet.mockResolvedValue({ gyms: [TWO_GYMS[0]] });

    const { result } = renderHook(() => useUserGyms());

    await waitFor(() => expect(result.current.gyms).toHaveLength(1));
    expect(result.current.canSwitch).toBe(false);
  });

  it('does not fetch before there is a token', async () => {
    // The hook renders inside headers that mount before auth resolves; a call
    // without a token would 401 and leave the switch permanently hidden.
    mockToken = null;

    const { result } = renderHook(() => useUserGyms());

    await act(async () => {});
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.canSwitch).toBe(false);
  });

  it('hides the switch rather than surfacing a failed list fetch', async () => {
    mockGet.mockRejectedValue(new Error('Network down'));

    const { result } = renderHook(() => useUserGyms());

    await act(async () => {});
    expect(result.current.gyms).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('reports true and stays quiet when the switch takes', async () => {
    mockGet.mockResolvedValue({ gyms: TWO_GYMS });

    const { result } = renderHook(() => useUserGyms());
    await waitFor(() => expect(result.current.canSwitch).toBe(true));

    let took: boolean | undefined;
    await act(async () => {
      took = await result.current.select('gym-b');
    });

    expect(mockSwitchGym).toHaveBeenCalledWith('gym-b');
    expect(took).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('reports false and names the failure when the switch is refused', async () => {
    mockGet.mockResolvedValue({ gyms: TWO_GYMS });
    mockSwitchGym.mockRejectedValue(new Error('Forbidden'));

    const { result } = renderHook(() => useUserGyms());
    await waitFor(() => expect(result.current.canSwitch).toBe(true));

    let took: boolean | undefined;
    await act(async () => {
      took = await result.current.select('gym-b');
    });

    // The boolean is what callers dismiss on. Reading `error` instead would
    // read the previous render's value, which is why `select` answers directly.
    expect(took).toBe(false);
    expect(result.current.error).toBe('Could not switch gym.');
  });

  it('clears a stale refusal when the next attempt starts', async () => {
    mockGet.mockResolvedValue({ gyms: TWO_GYMS });
    mockSwitchGym.mockRejectedValueOnce(new Error('Forbidden'));

    const { result } = renderHook(() => useUserGyms());
    await waitFor(() => expect(result.current.canSwitch).toBe(true));

    await act(async () => {
      await result.current.select('gym-b');
    });
    expect(result.current.error).toBe('Could not switch gym.');

    await act(async () => {
      await result.current.select('gym-b');
    });
    expect(result.current.error).toBeNull();
  });
});
