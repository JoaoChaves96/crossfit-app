import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

const mockLogout = jest.fn(() => Promise.resolve());
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({ logout: mockLogout })),
}));

import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { getMockRouter } from '@/test-utils/mock-navigation';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OwnerSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('nav model', () => {
    it('exposes the canonical owner nav items in order', () => {
      const keys = OWNER_NAV_ITEMS.map((i) => i.key);
      expect(keys).toEqual([
        'dashboard',
        'schedule',
        'classes',
        'members',
        'coaches',
        'plans',
        'invites',
        'settings',
      ]);
    });

    it('marks Dashboard, Classes and Plans as disabled', () => {
      const disabled = OWNER_NAV_ITEMS.filter((i) => !i.enabled).map((i) => i.key);
      expect(disabled).toEqual(['dashboard', 'classes', 'plans']);
    });

    it('labels the members item "Members", never "Athletes"', () => {
      const members = OWNER_NAV_ITEMS.find((i) => i.key === 'members');
      expect(members?.label).toBe('Members');
    });
  });

  describe('rendering', () => {
    it('renders the logo and every nav label', () => {
      const utils = render(<OwnerSidebar activeItem="classes" />);

      expect(utils.getByText('CrossFit Box')).toBeTruthy();
      OWNER_NAV_ITEMS.forEach((item) => {
        expect(utils.getByText(item.label)).toBeTruthy();
      });
    });
  });

  describe('navigation via onNavigate', () => {
    it('calls onNavigate with the pressed item key for an enabled item', () => {
      const onNavigate = jest.fn();
      const utils = render(<OwnerSidebar activeItem="classes" onNavigate={onNavigate} />);

      fireEvent.press(utils.getByTestId('nav-schedule'));

      expect(onNavigate).toHaveBeenCalledWith('schedule');
    });

    it('does not call onNavigate for a disabled item', () => {
      const onNavigate = jest.fn();
      const utils = render(<OwnerSidebar activeItem="schedule" onNavigate={onNavigate} />);

      fireEvent.press(utils.getByTestId('nav-classes'));

      expect(onNavigate).not.toHaveBeenCalled();
    });
  });

  describe('direct routing fallback', () => {
    it('routes via expo-router to the item route when no onNavigate is given', () => {
      const utils = render(<OwnerSidebar activeItem="classes" />);

      fireEvent.press(utils.getByTestId('nav-members'));

      expect(getMockRouter().push).toHaveBeenCalledWith('/members');
    });
  });

  describe('log out', () => {
    it('renders a Log Out control (the only sign-out path for owner screens)', () => {
      const utils = render(<OwnerSidebar activeItem="schedule" />);
      expect(utils.getByTestId('nav-logout')).toBeTruthy();
    });

    it('logs out and redirects to /login when pressed, ignoring onNavigate', async () => {
      const onNavigate = jest.fn();
      const utils = render(<OwnerSidebar activeItem="schedule" onNavigate={onNavigate} />);

      await fireEvent.press(utils.getByTestId('nav-logout'));

      expect(mockLogout).toHaveBeenCalled();
      expect(getMockRouter().replace).toHaveBeenCalledWith('/login');
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});
