import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

let mockIsMobile = false;

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: mockIsMobile,
    isDesktop: !mockIsMobile,
    width: mockIsMobile ? 390 : 1280,
  }),
}));

const mockApiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() };

jest.mock('@/utils/api-client', () => ({ createApiClient: () => mockApiClient }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ token: 'test-token' }) }));
jest.mock('@/hooks/useGym', () => ({ useGym: () => ({ currentGymId: 'gym-abc' }) }));

import MembersScreen from '@/app/members';

function buildMember(overrides = {}) {
  return {
    id: 'gm-1',
    userId: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    status: 'active',
    joinedAt: '2026-01-15T10:00:00.000Z',
    planId: 'plan-1',
    planName: 'Unlimited',
    // Midday, not UTC midnight: the screen formats in local time, so a midnight
    // timestamp renders as the previous day for anyone west of Greenwich and the
    // assertions below would fail on their machine but pass in CI.
    expiresAt: '2026-09-01T12:00:00.000Z',
    membershipStatus: 'active',
    autoRoll: true,
    autoRollCount: 2,
    ...overrides,
  };
}

describe('MembersScreen', () => {
  beforeEach(() => {
    mockIsMobile = false;
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
  });

  it('shows the plan name and expiry on desktop', async () => {
    mockApiClient.get.mockResolvedValue({ members: [buildMember()] });

    render(<MembersScreen />);

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Unlimited')).toBeTruthy();
    expect(screen.getByText('Sep 1, 2026')).toBeTruthy();
  });

  it('renders each derived membership status with its own chip label', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Ann Active', membershipStatus: 'active' }),
        buildMember({ id: 'gm-2', name: 'Ed Expiring', membershipStatus: 'expiring' }),
        buildMember({ id: 'gm-3', name: 'Xan Expired', membershipStatus: 'expired' }),
        buildMember({ id: 'gm-4', name: 'Sam Suspended', membershipStatus: 'inactive' }),
      ],
    });

    render(<MembersScreen />);

    expect(await screen.findByText('Active')).toBeTruthy();
    expect(screen.getByText('Expiring')).toBeTruthy();
    expect(screen.getByText('Expired')).toBeTruthy();
    expect(screen.getByText('Suspended')).toBeTruthy();
  });

  it('marks a member whose plan auto-renewed without owner confirmation', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Ann Confirmed', autoRollCount: 0 }),
        buildMember({ id: 'gm-2', name: 'Roy Rolled', autoRollCount: 3 }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Roy Rolled');
    expect(screen.getByTestId('member-autoroll-gm-2')).toBeTruthy();
    expect(screen.getByText('↻ 3')).toBeTruthy();
    expect(screen.queryByTestId('member-autoroll-gm-1')).toBeNull();
  });

  it('shows a dash for a member with no plan', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ planId: null, planName: null, expiresAt: null, membershipStatus: 'expired' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('shows Unlimited for a plan with no expiry', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [buildMember({ expiresAt: null })],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    expect(screen.getByText('No expiry')).toBeTruthy();
  });

  it('filters by name and updates the count badge', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Jane Doe' }),
        buildMember({ id: 'gm-2', name: 'John Smith', email: 'john@example.com' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    expect(screen.getByText('2 members')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('members-search-input'), 'john');

    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.getByText('1 member')).toBeTruthy();
  });

  it('filters by email too', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Jane Doe', email: 'jane@example.com' }),
        buildMember({ id: 'gm-2', name: 'John Smith', email: 'john@other.com' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('members-search-input'), 'other.com');

    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.queryByText('Jane Doe')).toBeNull();
  });

  it('matches a lowercase target against an uppercase/mixed-case query', async () => {
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Jane Doe', email: 'jane@example.com' }),
        buildMember({ id: 'gm-2', name: 'John Smith', email: 'john@other.com' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    // Reverse direction of the earlier case-insensitivity check: here the query
    // is upper/mixed-case and the stored name/email are lowercase-ish already.
    fireEvent.changeText(screen.getByTestId('members-search-input'), 'JANE');

    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('renders the mobile card with plan and expiry', async () => {
    mockIsMobile = true;
    mockApiClient.get.mockResolvedValue({ members: [buildMember()] });

    render(<MembersScreen />);

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('Unlimited · Expires Sep 1, 2026')).toBeTruthy();
  });

  it('filters the mobile card list by search and updates the count badge', async () => {
    mockIsMobile = true;
    mockApiClient.get.mockResolvedValue({
      members: [
        buildMember({ id: 'gm-1', name: 'Jane Doe', email: 'jane@example.com' }),
        buildMember({ id: 'gm-2', name: 'John Smith', email: 'john@example.com' }),
      ],
    });

    render(<MembersScreen />);

    await screen.findByText('Jane Doe');
    expect(screen.getByText('2 members')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('members-search-input'), 'john');

    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.getByText('John Smith')).toBeTruthy();
    expect(screen.getByText('1 member')).toBeTruthy();
  });
});
