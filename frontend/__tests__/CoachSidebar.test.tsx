/**
 * Tests for CoachSidebar (components/CoachSidebar.tsx), covering the identity
 * slot and the absence of a second sign-out path.
 *
 * The coach used to sign out from a Log Out pinned to the foot of this nav, and
 * to switch gyms from an inline segmented control on the class list. Both are
 * gone: the gym menu is the single control for naming the gym, choosing another,
 * and signing out — the same one the athlete header carries. This sidebar is
 * rendered directly on desktop and inside a drawer on mobile, so where the menu
 * belongs differs by register, and that is what these tests hold.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
}));

// The GymMenu inside the identity slot fetches the gym list through this. One
// gym: this suite is about placement, and GymMenu.test.tsx owns switching.
jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({
    get: jest.fn().mockResolvedValue({
      gyms: [{ gymId: 'gym-1', gymName: 'Box One', role: 'coach' }],
    }),
  }),
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

// jsdom is 750px — under the breakpoint — so an unpinned suite renders mobile
// only, and mobile is the register that does NOT carry the menu here.
let mockIsMobile = false;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: mockIsMobile,
    isDesktop: !mockIsMobile,
    width: mockIsMobile ? 390 : 1280,
  }),
}));

import { CoachSidebar } from '@/components/CoachSidebar';

describe('CoachSidebar', () => {
  beforeEach(() => {
    mockIsMobile = false;
  });

  it('heads the desktop sidebar with the gym menu', async () => {
    render(<CoachSidebar activeItem="classes" />);

    // The top-left slot is the shell's identity, so on desktop the gym name and
    // its menu live where the static brand line used to.
    expect(await screen.findByText('Box One')).toBeTruthy();
    expect(screen.getByTestId('gym-menu-trigger')).toBeTruthy();
    expect(screen.queryByText('CrossFit Box')).toBeNull();
  });

  it('leaves the menu to the screen header when it is inside the mobile drawer', async () => {
    mockIsMobile = true;

    render(<CoachSidebar activeItem="classes" />);
    // Flushed so the gym-list fetch settles before the assertions — the menu is
    // absent here, so there is nothing to wait for by querying for it.
    await act(async () => {});

    // A drawer the coach has to open first is the wrong home for the control
    // that names the gym — coach-classes puts it in the header instead, so a
    // copy here would be a second trigger for the same menu.
    expect(screen.queryByTestId('gym-menu-trigger')).toBeNull();
    expect(screen.getByText('CrossFit Box')).toBeTruthy();
  });

  it('offers no sign-out of its own', async () => {
    render(<CoachSidebar activeItem="classes" />);
    await act(async () => {});

    // Two sign-out paths on one screen is one too many, and the gym menu's is
    // the one shared with the athlete surface.
    expect(screen.queryByTestId('nav-logout')).toBeNull();
  });
});
