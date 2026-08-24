/**
 * Tests for the SECURITY section of the Profile screen (change password).
 *
 * The section is rendered through ProfileScreen rather than in isolation,
 * because where it sits — and that it sits on both registers — is part of what
 * is being asserted. jsdom's window is 750px wide, so an unpinned suite would
 * only ever exercise the mobile branch (see the responsive-register note in the
 * repo's test guidance): both registers are pinned explicitly below.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { GymContext, GymContextType } from '@/context/GymContext';
import { createMockApiClient, MockApiClient } from '@/test-utils/mock-api-client';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => {
  class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  }
  return { ApiError, createApiClient: jest.fn() };
});

let mockIsDesktop = false;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isDesktop: mockIsDesktop,
    isMobile: !mockIsDesktop,
    width: mockIsDesktop ? 1280 : 390,
  }),
}));

jest.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    refresh: jest.fn(() => Promise.resolve()),
    markAsRead: jest.fn(() => Promise.resolve()),
    markAllAsRead: jest.fn(() => Promise.resolve()),
  }),
}));

import { createApiClient, ApiError } from '@/utils/api-client';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PROFILE = {
  id: 'user-1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'athlete',
  gymId: 'gym-1',
  createdAt: '2024-01-15T00:00:00.000Z',
};

const AUTH_CONTEXT: AuthContextType = {
  user: { id: 'user-1', email: 'john@example.com', role: 'athlete', gymId: 'gym-1' },
  token: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
};

const GYM_CONTEXT: GymContextType = {
  currentGymId: 'gym-1',
  isLoading: false,
  setCurrentGymId: jest.fn(),
  switchGym: jest.fn(),
};

async function renderProfile(): Promise<MockApiClient> {
  const api = createMockApiClient();
  api.get.mockResolvedValue(PROFILE);
  (createApiClient as jest.Mock).mockReturnValue(api);

  render(
    <AuthContext.Provider value={AUTH_CONTEXT}>
      {/* The desktop register draws DesktopTopNav, whose gym menu reads this
          context — without it the desktop case dies before the section renders. */}
      <GymContext.Provider value={GYM_CONTEXT}>
        <ProfileScreen />
      </GymContext.Provider>
    </AuthContext.Provider>,
  );

  await waitFor(() => expect(screen.getByTestId('change-password-open-btn')).toBeTruthy());
  return api;
}

/** Opens the form and fills all three fields. */
function fill(current: string, next: string, confirm: string) {
  fireEvent.press(screen.getByTestId('change-password-open-btn'));
  fireEvent.changeText(screen.getByTestId('change-password-current-input'), current);
  fireEvent.changeText(screen.getByTestId('change-password-new-input'), next);
  fireEvent.changeText(screen.getByTestId('change-password-confirm-input'), confirm);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Profile → change password', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDesktop = false;
  });

  it.each([
    ['mobile', false],
    ['desktop', true],
  ])('offers the section on %s', async (_label, isDesktop) => {
    mockIsDesktop = isDesktop;
    await renderProfile();

    expect(screen.getByTestId('change-password-open-btn')).toBeTruthy();
    // Collapsed until asked for.
    expect(screen.queryByTestId('change-password-current-input')).toBeNull();
  });

  it('posts the two passwords to change-password, and nothing else', async () => {
    const api = await renderProfile();
    api.post.mockResolvedValueOnce(undefined);

    fill('old-pw', 'new-pw', 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/api/auth/change-password', {
        currentPassword: 'old-pw',
        newPassword: 'new-pw',
      }),
    );
  });

  it('confirms in muted meta copy and collapses the form', async () => {
    const api = await renderProfile();
    api.post.mockResolvedValueOnce(undefined);

    fill('old-pw', 'new-pw', 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    expect(await screen.findByTestId('change-password-confirmation')).toBeTruthy();
    expect(screen.queryByTestId('change-password-current-input')).toBeNull();
  });

  it('does not sign the user out or re-issue a token', async () => {
    const api = await renderProfile();
    api.post.mockResolvedValueOnce(undefined);

    fill('old-pw', 'new-pw', 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    await screen.findByTestId('change-password-confirmation');
    expect(AUTH_CONTEXT.logout).not.toHaveBeenCalled();
    expect(AUTH_CONTEXT.login).not.toHaveBeenCalled();
  });

  it('catches a mismatched confirmation without calling the API', async () => {
    const api = await renderProfile();

    fill('old-pw', 'new-pw', 'different-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    expect(screen.getByTestId('change-password-error')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('catches an unchanged password without calling the API', async () => {
    const api = await renderProfile();

    fill('old-pw', 'old-pw', 'old-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    expect(screen.getByTestId('change-password-error')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('requires all three fields', async () => {
    const api = await renderProfile();

    fireEvent.press(screen.getByTestId('change-password-open-btn'));
    fireEvent.changeText(screen.getByTestId('change-password-new-input'), 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    expect(screen.getByTestId('change-password-error')).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();
  });

  // A 400 on this route means one thing only: the current password was wrong.
  // The session is valid, so it is not a 401 and must not read like an expiry.
  it('reads a 400 as a wrong current password, and stays open', async () => {
    const api = await renderProfile();
    api.post.mockRejectedValueOnce(new ApiError(400, 'Your current password is incorrect.'));

    fill('wrong-pw', 'new-pw', 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    const error = await screen.findByTestId('change-password-error');
    expect(error.props.children).toBe('That current password is not right.');
    expect(screen.getByTestId('change-password-current-input')).toBeTruthy();
    expect(screen.queryByTestId('change-password-confirmation')).toBeNull();
  });

  it('shows the client message for any other failure', async () => {
    const api = await renderProfile();
    api.post.mockRejectedValueOnce(new ApiError(500, 'server exploded'));

    fill('old-pw', 'new-pw', 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));

    const error = await screen.findByTestId('change-password-error');
    expect(error.props.children).toBe('server exploded');
  });

  it('clears the error as soon as a field is edited', async () => {
    const api = await renderProfile();
    api.post.mockRejectedValueOnce(new ApiError(400, 'nope'));

    fill('wrong-pw', 'new-pw', 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-submit-btn'));
    await screen.findByTestId('change-password-error');

    fireEvent.changeText(screen.getByTestId('change-password-current-input'), 'old-pw');
    expect(screen.queryByTestId('change-password-error')).toBeNull();
  });

  it('discards what was typed on cancel', async () => {
    const api = await renderProfile();

    fill('old-pw', 'new-pw', 'new-pw');
    fireEvent.press(screen.getByTestId('change-password-cancel-btn'));

    expect(screen.queryByTestId('change-password-current-input')).toBeNull();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('change-password-open-btn'));
    expect(screen.getByTestId('change-password-current-input').props.value).toBe('');
  });
});
