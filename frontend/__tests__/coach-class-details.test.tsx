/**
 * Tests for the coach-facing CoachClassDetailsScreen (app/coach-class-details.tsx),
 * covering the lifecycle transition control.
 *
 * The assigned coach is the actor the backend expects on a manual transition
 * (`manually-transition-class-state.handler`), yet no coach screen used to offer
 * a route to it — the e2e journey had to reach the owner's screen by URL. These
 * tests hold that entry point in place, in both registers.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import CoachClassDetailsScreen from '@/app/coach-class-details';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { createMockApiClient } from '@/test-utils/mock-api-client';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

// showConfirm, never Alert.alert: react-native-web's Alert is a no-op, which is
// how the owner's control shipped dead once already. See useClassTransition.
jest.mock('@/utils/alert', () => ({
  showConfirm: jest.fn(),
  showError: jest.fn(),
  showAlert: jest.fn(),
}));

// jsdom's window is 750px — under the 768px breakpoint — so an unpinned suite
// only ever renders the mobile register. This screen returns a separate desktop
// tree (sidebar + two columns), so pin it and let the desktop block opt in.
let mockIsDesktop = false;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: !mockIsDesktop,
    isDesktop: mockIsDesktop,
    width: mockIsDesktop ? 1280 : 390,
  }),
}));

import { createApiClient } from '@/utils/api-client';
import { showConfirm } from '@/utils/alert';
import { useLocalSearchParams } from 'expo-router';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const GYM_ID = 'gym-1';
const CLASS_ID = 'class-abc';

const AUTH_CONTEXT: AuthContextType = {
  user: { id: 'coach-1', email: 'coach@example.com', role: 'coach', gymId: GYM_ID },
  token: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
};

const GYM_CONTEXT = {
  currentGymId: GYM_ID,
  isLoading: false,
  setCurrentGymId: jest.fn(),
  switchGym: jest.fn(),
};

function buildParams(state = 'published') {
  return {
    classId: CLASS_ID,
    classTypeName: 'CrossFit',
    scheduledDate: '2026-05-06',
    scheduledTime: '07:00',
    duration: '60',
    spaceName: 'Main Floor',
    capacity: '20',
    bookedCount: '10',
    state,
  };
}

type AlertButton = { text?: string; onPress?: () => void | Promise<void> };

function confirmButton(): AlertButton {
  const calls = (showConfirm as jest.Mock).mock.calls;
  if (calls.length === 0) throw new Error('showConfirm was never called');
  const buttons: AlertButton[] = calls[calls.length - 1][2] ?? [];
  const button = buttons.find((b) => b.text === 'Confirm');
  if (!button) throw new Error('No Confirm button in the last showConfirm call');
  return button;
}

async function renderScreen(state = 'published') {
  const mockApi = createMockApiClient();
  // Programming fetch on mount — nothing programmed yet.
  mockApi.get.mockResolvedValue({ content: null, loggable: false, lastUpdatedAt: null });
  mockApi.post.mockResolvedValue({});
  (createApiClient as jest.Mock).mockReturnValue(mockApi);
  (useLocalSearchParams as jest.Mock).mockReturnValue(buildParams(state));

  const utils = render(
    <AuthContext.Provider value={AUTH_CONTEXT}>
      <GymContext.Provider value={GYM_CONTEXT}>
        <CoachClassDetailsScreen />
      </GymContext.Provider>
    </AuthContext.Provider>
  );
  // Flush the mount-time programming fetch.
  await act(async () => {});
  return { ...utils, mockApi };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsDesktop = false;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CoachClassDetailsScreen — lifecycle transition', () => {
  it('offers the transition control on the coach screen', async () => {
    await renderScreen();

    expect(screen.getByTestId('class-transition-btn')).toBeTruthy();
  });

  it('offers the transition control in the desktop register too', async () => {
    mockIsDesktop = true;
    await renderScreen();

    // Positive anchor on the same screen, so a missing control cannot pass as an
    // empty render.
    expect(screen.getByTestId('coach-class-details-screen')).toBeTruthy();
    expect(screen.getByTestId('class-transition-btn')).toBeTruthy();
  });

  it('confirms before transitioning, and posts to the transition endpoint', async () => {
    const { mockApi } = await renderScreen();

    fireEvent.press(screen.getByTestId('class-transition-btn'));

    expect(showConfirm).toHaveBeenCalledTimes(1);
    expect(mockApi.post).not.toHaveBeenCalled();

    await act(async () => {
      await confirmButton().onPress?.();
    });

    expect(mockApi.post).toHaveBeenCalledWith(
      `/api/gyms/${GYM_ID}/classes/${CLASS_ID}/transition`,
      expect.objectContaining({ classId: CLASS_ID, targetState: 'booking_closed' })
    );
  });

  it('advances the displayed state after a successful transition', async () => {
    await renderScreen('booking_closed');

    expect(screen.getByText('Booking Closed')).toBeTruthy();

    fireEvent.press(screen.getByTestId('class-transition-btn'));
    await act(async () => {
      await confirmButton().onPress?.();
    });

    expect(screen.getByText('In Progress')).toBeTruthy();
    expect(screen.queryByText('Booking Closed')).toBeNull();
  });

  it('locks the programming form once the transition leaves the editable states', async () => {
    await renderScreen('booking_closed');

    // Editable while booking_closed: the form and its Save button are offered.
    expect(screen.getByTestId('programming-wod-input')).toBeTruthy();
    expect(screen.queryByTestId('programming-locked-notice')).toBeNull();

    fireEvent.press(screen.getByTestId('class-transition-btn'));
    await act(async () => {
      await confirmButton().onPress?.();
    });

    // in_progress is past the lifecycle lock, so the backend would refuse a save
    // — the screen must stop offering one.
    expect(screen.getByTestId('programming-locked-notice')).toBeTruthy();
    expect(screen.queryByTestId('programming-wod-input')).toBeNull();
  });

  it('does not offer a transition out of archived', async () => {
    await renderScreen('archived');

    const badge = screen.getByTestId('class-transition-btn');
    fireEvent.press(badge);

    expect(showConfirm).not.toHaveBeenCalled();
    expect(screen.getByText('Archived')).toBeTruthy();
  });
});
