import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

// Pin the desktop register — jsdom is 750px wide, which resolves to mobile,
// so an unpinned suite here would never exercise the desktop path. The
// mobile path is covered elsewhere in the suite as a whole.
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: false, isDesktop: true, width: 1280 }),
}));

const mockGet = jest.fn();
jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token' }),
}));

const mockSwitchGym = jest.fn().mockResolvedValue(undefined);

jest.mock('@/hooks/useGym', () => ({
  useGym: () => ({
    currentGymId: 'gym-a',
    isLoading: false,
    setCurrentGymId: jest.fn(),
    switchGym: mockSwitchGym,
  }),
}));

import { GymSwitcher } from '@/components/GymSwitcher';

describe('GymSwitcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSwitchGym.mockResolvedValue(undefined);
  });

  const twoGyms = {
    gyms: [
      { gymId: 'gym-a', gymName: 'Box A', role: 'coach' },
      { gymId: 'gym-b', gymName: 'Box B', role: 'coach' },
    ],
  };

  it('renders nothing when the user has a single gym', async () => {
    mockGet.mockResolvedValue({ gyms: [twoGyms.gyms[0]] });

    render(<GymSwitcher />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/me/gyms'));
    expect(screen.queryByTestId('gym-switcher')).toBeNull();
  });

  it('offers every gym when there is more than one', async () => {
    mockGet.mockResolvedValue(twoGyms);

    render(<GymSwitcher />);

    await waitFor(() => expect(screen.getByTestId('gym-switcher')).toBeTruthy());
    expect(screen.getByText('Box A')).toBeTruthy();
    expect(screen.getByText('Box B')).toBeTruthy();
  });

  it('asks the context to switch to the chosen gym', async () => {
    mockGet.mockResolvedValue(twoGyms);

    render(<GymSwitcher />);
    await waitFor(() => expect(screen.getByTestId('gym-switcher')).toBeTruthy());

    fireEvent.press(screen.getByTestId('gym-switcher-option-gym-b'));

    await waitFor(() => expect(mockSwitchGym).toHaveBeenCalledWith('gym-b'));
  });

  it('surfaces a refused switch instead of failing silently', async () => {
    mockGet.mockResolvedValue(twoGyms);
    mockSwitchGym.mockRejectedValue(new Error('Forbidden'));

    render(<GymSwitcher />);
    await waitFor(() => expect(screen.getByTestId('gym-switcher')).toBeTruthy());

    fireEvent.press(screen.getByTestId('gym-switcher-option-gym-b'));

    await waitFor(() => expect(screen.getByText('Could not switch gym.')).toBeTruthy());
  });
});
