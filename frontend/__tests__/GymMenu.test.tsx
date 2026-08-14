import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    navigate: jest.fn(),
  })),
}));

const mockGet = jest.fn();
jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet }),
}));

const mockLogout = jest.fn().mockResolvedValue(undefined);
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token', logout: mockLogout }),
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

import { GymMenu } from '@/components/GymMenu';

const TWO_GYMS = {
  gyms: [
    { gymId: 'gym-a', gymName: 'Box A', role: 'athlete' },
    { gymId: 'gym-b', gymName: 'Box B', role: 'athlete' },
  ],
};

async function openMenu() {
  render(<GymMenu gymName="Box A" />);
  await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/me/gyms'));
  fireEvent.press(screen.getByTestId('gym-menu-trigger'));
}

describe('GymMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSwitchGym.mockResolvedValue(undefined);
  });

  it('offers nothing to switch to when the session has a single gym', async () => {
    mockGet.mockResolvedValue({ gyms: [TWO_GYMS.gyms[0]] });

    await openMenu();

    // The menu still opens and still logs out — a single-gym caller sees
    // exactly what they saw before switching existed.
    expect(screen.getByTestId('gym-menu-logout')).toBeTruthy();
    expect(screen.queryByTestId('gym-switcher')).toBeNull();
    expect(screen.queryByTestId('gym-switcher-option-gym-a')).toBeNull();
  });

  it('lists the other gyms under the current one', async () => {
    mockGet.mockResolvedValue(TWO_GYMS);

    await openMenu();

    await waitFor(() => expect(screen.getByTestId('gym-switcher-option-gym-b')).toBeTruthy());
    expect(screen.getByText('Current gym')).toBeTruthy();
    // The active gym is named once, by the row that already headed the menu —
    // a row for it among the choices would be a no-op that reads as a choice.
    expect(screen.queryByTestId('gym-switcher-option-gym-a')).toBeNull();
  });

  it('asks the context to switch to the chosen gym', async () => {
    mockGet.mockResolvedValue(TWO_GYMS);

    await openMenu();
    await waitFor(() => expect(screen.getByTestId('gym-switcher-option-gym-b')).toBeTruthy());

    fireEvent.press(screen.getByTestId('gym-switcher-option-gym-b'));

    await waitFor(() => expect(mockSwitchGym).toHaveBeenCalledWith('gym-b'));
  });

  it('dismisses once the switch took', async () => {
    mockGet.mockResolvedValue(TWO_GYMS);

    await openMenu();
    await waitFor(() => expect(screen.getByTestId('gym-switcher-option-gym-b')).toBeTruthy());

    // Pressed inside `act` so the handler's await chain settles before the
    // assertion, rather than the assertion polling for a disappearance — a
    // poll that only fails when the machine is busy is a flake, not a test.
    await act(async () => {
      fireEvent.press(screen.getByTestId('gym-switcher-option-gym-b'));
    });

    // There is no success message (no success role): the screen behind
    // redrawing with the new gym's data is the confirmation, so the menu has
    // to get out of the way.
    expect(screen.queryByTestId('gym-menu-logout')).toBeNull();
  });

  it('stays open and says so when the switch is refused', async () => {
    mockGet.mockResolvedValue(TWO_GYMS);
    mockSwitchGym.mockRejectedValue(new Error('Forbidden'));

    await openMenu();
    await waitFor(() => expect(screen.getByTestId('gym-switcher-option-gym-b')).toBeTruthy());

    fireEvent.press(screen.getByTestId('gym-switcher-option-gym-b'));

    // Closing on failure would take the only account of the failure with it.
    await waitFor(() => expect(screen.getByText('Could not switch gym.')).toBeTruthy());
    expect(screen.getByTestId('gym-menu-logout')).toBeTruthy();
  });

  it('logs out and leaves for the login screen', async () => {
    mockGet.mockResolvedValue(TWO_GYMS);

    await openMenu();

    fireEvent.press(screen.getByTestId('gym-menu-logout'));

    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});
