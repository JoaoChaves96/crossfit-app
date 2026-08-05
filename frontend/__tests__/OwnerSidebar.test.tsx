import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OwnerSidebar, OWNER_NAV_ITEMS } from '@/components/OwnerSidebar';
import { getMockRouter } from '@/test-utils/mock-navigation';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OwnerSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('nav model', () => {
    it('exposes the canonical owner nav items without a Plans entry', () => {
      const keys = OWNER_NAV_ITEMS.map((i) => i.key);
      expect(keys).toEqual(['dashboard', 'schedule', 'classes', 'members', 'coaches', 'settings']);
      expect(keys).not.toContain('plans');
    });

    it('marks Dashboard and Classes as disabled', () => {
      const disabled = OWNER_NAV_ITEMS.filter((i) => !i.enabled).map((i) => i.key);
      expect(disabled).toEqual(['dashboard', 'classes']);
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
});
