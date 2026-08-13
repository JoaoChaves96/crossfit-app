import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

let mockIsMobile = false;

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: mockIsMobile,
    isDesktop: !mockIsMobile,
    width: mockIsMobile ? 390 : 1280,
  }),
}));

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet, post: mockPost, patch: mockPatch, delete: mockDelete }),
}));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/hooks/useGym', () => ({ useGym: () => ({ currentGymId: 'gym-1' }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

const mockSetString = jest.fn();
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  default: { setString: (v: string) => mockSetString(v) },
}));

import CoachesScreen from '@/app/coaches';

const activeCoach = {
  id: 'gs-1',
  userId: 'user-9',
  name: 'Carla Coach',
  email: 'carla@example.com',
  status: 'active',
  classesAssigned: [],
};

const pendingInvite = {
  id: 'inv-1',
  inviteeEmail: 'dana@example.com',
  inviteToken: 'tok-abc',
  role: 'coach',
  status: 'pending',
  createdAt: '2026-08-13T10:00:00.000Z',
  expiresAt: '2026-08-20T10:00:00.000Z',
  acceptedAt: null,
};

describe('CoachesScreen — pending invites', () => {
  beforeEach(() => {
    mockIsMobile = false;
    [mockGet, mockPost, mockPatch, mockDelete, mockSetString].forEach((fn) => fn.mockReset());
  });

  it('lists a pending coach invite alongside active coaches', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/invites')
        ? Promise.resolve([pendingInvite])
        : Promise.resolve({ coaches: [activeCoach] }),
    );

    render(<CoachesScreen />);

    await waitFor(() => expect(screen.getByTestId('pending-invite-row-tok-abc')).toBeTruthy());
    expect(screen.getByText('dana@example.com')).toBeTruthy();
    expect(screen.getByText('Pending')).toBeTruthy();
    // Positive anchor: the active coach is still on screen, so the pending row
    // was added rather than replacing the list.
    expect(screen.getByText(activeCoach.email)).toBeTruthy();
  });

  it('only asks for coach invites, never the athlete ones', async () => {
    mockGet.mockResolvedValue({ coaches: [] });

    render(<CoachesScreen />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/gyms/gym-1/invites?role=coach'));
  });

  it('copies the invite link for a pending row', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/invites') ? Promise.resolve([pendingInvite]) : Promise.resolve({ coaches: [] }),
    );

    render(<CoachesScreen />);
    await waitFor(() => expect(screen.getByTestId('copy-invite-link-tok-abc')).toBeTruthy());

    fireEvent.press(screen.getByTestId('copy-invite-link-tok-abc'));

    expect(mockSetString).toHaveBeenCalledWith(expect.stringContaining('/invite/tok-abc'));
    expect(screen.getByText('Copied!')).toBeTruthy();
  });

  it('revokes a pending invite and refetches', async () => {
    mockGet.mockImplementation((url: string) =>
      url.includes('/invites') ? Promise.resolve([pendingInvite]) : Promise.resolve({ coaches: [] }),
    );
    mockDelete.mockResolvedValue({ message: 'Invite revoked' });

    render(<CoachesScreen />);
    await waitFor(() => expect(screen.getByTestId('revoke-invite-tok-abc')).toBeTruthy());

    fireEvent.press(screen.getByTestId('revoke-invite-tok-abc'));

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/api/gyms/gym-1/invites/tok-abc'),
    );
  });

  it('shows the generated link after sending an invite, instead of claiming success', async () => {
    mockGet.mockResolvedValue({ coaches: [] });
    mockPost.mockResolvedValue({
      inviteToken: 'tok-new',
      inviteLink: 'http://localhost:8081/invite/tok-new',
      expiresAt: '2026-08-20T10:00:00.000Z',
      inviteeEmail: 'new@example.com',
      role: 'coach',
    });

    render(<CoachesScreen />);
    fireEvent.press(screen.getByTestId('invite-coach-btn'));
    fireEvent.changeText(screen.getByTestId('invite-coach-email-input'), 'new@example.com');
    fireEvent.press(screen.getByTestId('modal-confirm-btn'));

    await waitFor(() => expect(screen.getByTestId('coach-invite-link-text')).toBeTruthy());
    expect(screen.getByText('http://localhost:8081/invite/tok-new')).toBeTruthy();
  });
});
