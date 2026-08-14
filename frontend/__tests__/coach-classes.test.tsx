/**
 * Tests for CoachClassesScreen (app/coach-classes.tsx), covering where the gym
 * menu sits in each register.
 *
 * The screen used to carry an inline segmented gym switcher below its title.
 * That control is gone; the coach now switches gyms and signs out from the same
 * GymMenu the athlete uses. On desktop the menu lives in CoachSidebar's
 * top-left slot, so this screen must not draw a second one — and on mobile the
 * sidebar is behind a drawer, so this screen is the only place it can go.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  }),
}));

// Routed by URL: the class list and the gym menu's own list both come through
// this client, and the menu is handed a single gym — GymMenu.test.tsx owns
// switching, this suite owns placement.
const mockGet = jest.fn((url: string) => {
  if (url === '/api/me/gyms') {
    return Promise.resolve({ gyms: [{ gymId: 'gym-1', gymName: 'Box One', role: 'coach' }] });
  }
  if (url === '/api/gyms/gym-1/coach/classes') {
    return Promise.resolve({ classes: [] });
  }
  return Promise.reject(new Error(`unexpected request: ${url}`));
});
jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet }),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token', logout: jest.fn() }),
}));

jest.mock('@/hooks/useGym', () => ({
  useGym: () => ({
    currentGymId: 'gym-1',
    isLoading: false,
    setCurrentGymId: jest.fn(),
    switchGym: jest.fn(),
  }),
}));

// jsdom is 750px, which is already the mobile register — pinned anyway so the
// desktop case can opt in, and so neither case depends on the window size.
let mockIsMobile = true;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: mockIsMobile,
    isDesktop: !mockIsMobile,
    width: mockIsMobile ? 390 : 1280,
  }),
}));

import CoachClassesScreen from '@/app/coach-classes';

async function renderScreen() {
  render(<CoachClassesScreen />);
  await act(async () => {});
}

describe('CoachClassesScreen — gym menu placement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMobile = true;
  });

  it('carries the gym menu in the header on mobile', async () => {
    await renderScreen();

    // Beside the hamburger, not inside the drawer it opens: the control that
    // names the gym and signs the coach out has to be reachable without a tap.
    expect(screen.getByTestId('hamburger-btn')).toBeTruthy();
    expect(screen.getByTestId('gym-menu-trigger')).toBeTruthy();
    expect(screen.getByText('Box One')).toBeTruthy();
  });

  it('leaves the menu to the sidebar on desktop', async () => {
    mockIsMobile = false;

    await renderScreen();

    // Exactly one trigger, the sidebar's. A second in the screen header would
    // be two controls opening the same menu.
    expect(screen.getAllByTestId('gym-menu-trigger')).toHaveLength(1);
  });
});
