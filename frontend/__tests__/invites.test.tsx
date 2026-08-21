import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';

// jsdom is 750px wide, so an unpinned suite would silently test the mobile
// register only. Pin it explicitly.
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
const mockDelete = jest.fn();

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => ({ get: mockGet, post: mockPost, delete: mockDelete }),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token', user: { id: 'u1', role: 'owner' } }),
}));
jest.mock('@/hooks/useGym', () => ({ useGym: () => ({ currentGymId: 'gym-1' }) }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const mockSetString = jest.fn();
jest.mock('react-native/Libraries/Components/Clipboard/Clipboard', () => ({
  default: { setString: (v: string) => mockSetString(v) },
}));

import InvitesScreen from '@/app/invites';

const CREATED = {
  inviteToken: 'tok-new',
  inviteLink: 'https://app.boxops.dev/invite/tok-new',
  expiresAt: '2026-08-28T10:00:00.000Z',
  inviteeEmail: 'dana@example.com',
  role: 'athlete',
};

async function createInvite(delivery: 'sent' | 'failed') {
  mockPost.mockResolvedValue({ ...CREATED, delivery });

  render(<InvitesScreen />);
  fireEvent.press(screen.getByText('Invite an Athlete'));
  fireEvent.changeText(screen.getByTestId('invite-email-input'), 'dana@example.com');
  fireEvent.press(screen.getByTestId('invite-send-btn'));

  await waitFor(() => expect(screen.getByTestId('invite-link-text')).toBeTruthy());
}

describe('InvitesScreen — delivery', () => {
  beforeEach(() => {
    mockIsMobile = false;
    [mockGet, mockPost, mockDelete, mockSetString].forEach((fn) => fn.mockReset());
  });

  it('confirms the email went out and still offers the link', async () => {
    await createInvite('sent');

    expect(screen.getByText('Invite emailed to dana@example.com.')).toBeTruthy();
    expect(screen.getByText('Or send them the link yourself; it expires in 7 days.')).toBeTruthy();
    expect(screen.getByText('https://app.boxops.dev/invite/tok-new')).toBeTruthy();
  });

  it('says delivery failed without losing the invite', async () => {
    await createInvite('failed');

    expect(
      screen.getByText("We couldn't email this invite. It's still valid — send them the link yourself."),
    ).toBeTruthy();
    expect(screen.getByText('https://app.boxops.dev/invite/tok-new')).toBeTruthy();
  });

  it('no longer claims that nothing is delivered', async () => {
    render(<InvitesScreen />);

    expect(screen.queryByText(/No email goes out/)).toBeNull();
    expect(screen.queryByText(/Nothing is delivered automatically/)).toBeNull();
  });

  // "Cancel" cannot survive the send: the invite exists and was emailed, so the
  // button acknowledges rather than pretending to undo.
  it('labels the row action Resend, because a send now happens', async () => {
    await createInvite('sent');
    expect(screen.queryByText('Cancel')).toBeNull();
    fireEvent.press(screen.getByText('Done'));

    await waitFor(() => expect(screen.getByText('Resend')).toBeTruthy());
    expect(screen.queryByText('New link')).toBeNull();
  });

  it('operates on the mobile register too', async () => {
    mockIsMobile = true;
    await createInvite('sent');

    expect(screen.getByText('Invite emailed to dana@example.com.')).toBeTruthy();
  });
});
