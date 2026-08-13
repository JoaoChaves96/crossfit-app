import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import InviteAcceptanceScreen from '@/app/invite/[inviteToken]';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockLogin = jest.fn();
const mockSetCurrentGymId = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useLocalSearchParams: () => ({ inviteToken: 'tok-abc' }),
}));

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet, post: mockPost }),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number) {
      super('api error');
      this.status = status;
    }
  },
}));

// The screen reads AuthContext and GymContext via useContext, so render inside
// real providers rather than mocking React itself.
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { GymContext, GymContextType } from '@/context/GymContext';

let authValue: AuthContextType;

const gymValue: GymContextType = {
  currentGymId: null,
  isLoading: false,
  setCurrentGymId: mockSetCurrentGymId,
};

function renderScreen() {
  return render(
    <AuthContext.Provider value={authValue}>
      <GymContext.Provider value={gymValue}>
        <InviteAcceptanceScreen />
      </GymContext.Provider>
    </AuthContext.Provider>,
  );
}

const coachInvite = {
  gymId: 'gym-1',
  gymName: 'Box One',
  gymLocation: 'Lisbon',
  inviteeEmail: 'dana@example.com',
  inviterName: 'Olivia Owner',
  inviterRole: 'owner',
  expiresAt: '2026-08-20T00:00:00.000Z',
  status: 'pending',
  role: 'coach',
};

describe('invite acceptance — coach invites', () => {
  const authenticated: AuthContextType = {
    user: { id: 'user-7', email: 'dana@example.com', role: null, gymId: null },
    token: 'old.jwt.token',
    isAuthenticated: true,
    isLoading: false,
    login: mockLogin,
    logout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks clears calls, not implementations — without this the
    // rejection set by the storage-failure test leaks into every test after it.
    mockSetCurrentGymId.mockResolvedValue(undefined);
    authValue = authenticated;
  });

  it('announces a coaching invite, not a membership', async () => {
    mockGet.mockResolvedValue(coachInvite);

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(`Coach at ${coachInvite.gymName} on CrossFit Box`)).toBeTruthy();
    });
    expect(screen.getByText('Accept & Join as Coach')).toBeTruthy();
  });

  it('stores the re-signed token and lands the new coach on their classes', async () => {
    mockGet.mockResolvedValue(coachInvite);
    mockPost.mockResolvedValue({
      gym: { id: 'gym-1', name: 'Box One' },
      user: { id: 'user-7', email: 'dana@example.com' },
      role: 'coach',
      token: 'new.jwt.token',
      message: 'Successfully joined gym as coach',
    });

    renderScreen();
    await waitFor(() => expect(screen.getByTestId('invite-join-btn')).toBeTruthy());

    fireEvent.press(screen.getByTestId('invite-join-btn'));

    // Explicit budget: RNTL's 1 s default lost to machine contention when other
    // suites ran in parallel, which read as a defect in this screen.
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('new.jwt.token'), {
      timeout: 5000,
    });
    expect(mockReplace).toHaveBeenCalledWith('/coach-classes');

    // The token is not enough on its own: /coach-classes issues no request at
    // all while GymContext is empty, so an accepted coach saw an empty screen
    // until they logged out and back in. Set from the server's gym, and set
    // before we navigate, so the destination has context on mount.
    expect(mockSetCurrentGymId).toHaveBeenCalledWith('gym-1');
    expect(mockSetCurrentGymId.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0],
    );
  });

  it('still lands an accepted coach when storing gym context fails', async () => {
    mockGet.mockResolvedValue(coachInvite);
    mockPost.mockResolvedValue({
      gym: { id: 'gym-1', name: 'Box One' },
      user: { id: 'user-7', email: 'dana@example.com' },
      role: 'coach',
      token: 'new.jwt.token',
      message: 'Successfully joined gym as coach',
    });
    mockSetCurrentGymId.mockRejectedValue(new Error('storage unavailable'));

    renderScreen();
    await waitFor(() => expect(screen.getByTestId('invite-join-btn')).toBeTruthy());

    fireEvent.press(screen.getByTestId('invite-join-btn'));

    // The server already committed the staff row. Showing the accept error here
    // would offer "Try Again", which re-posts accept and answers 400 — so a
    // real coach would be told twice that they are not one.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/coach-classes'));
    expect(screen.queryByText('Something went wrong. Please try again.')).toBeNull();
  });

  it('sends an unauthenticated coach invitee to register with the token', async () => {
    authValue = { ...authenticated, user: null, token: null, isAuthenticated: false };
    mockGet.mockResolvedValue(coachInvite);

    renderScreen();
    await waitFor(() => expect(screen.getByTestId('invite-join-btn')).toBeTruthy());

    fireEvent.press(screen.getByTestId('invite-join-btn'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/register',
      params: { inviteToken: 'tok-abc', email: 'dana@example.com' },
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('keeps athlete copy and routing for an athlete invite', async () => {
    mockGet.mockResolvedValue({ ...coachInvite, role: 'athlete' });
    mockPost.mockResolvedValue({
      gym: { id: 'gym-1', name: 'Box One' },
      user: { id: 'user-7', email: 'dana@example.com' },
      role: 'athlete',
      token: 'new.jwt.token',
      message: 'Successfully joined gym',
    });

    renderScreen();
    await waitFor(() => expect(screen.getByText('Join Box One on CrossFit Box')).toBeTruthy());

    fireEvent.press(screen.getByTestId('invite-join-btn'));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/schedule'));

    // The athlete branch had the same missing gym context and no e2e journey
    // covers athlete acceptance any more, so this is its only guard.
    expect(mockSetCurrentGymId).toHaveBeenCalledWith('gym-1');
  });
});
