import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@/utils/api-client', () => ({
  createApiClient: () => mockApiClient,
}));

import { PlansTab } from '@/app/gym-settings/PlansTab';

const DEFAULT_PROPS = { gymId: 'gym-abc', token: 'test-token', isMobile: false };

function buildPlan(overrides = {}) {
  return {
    id: 'plan-1',
    name: 'Unlimited',
    pricing: 12000,
    billingCycle: 'monthly',
    classTypes: ['ct-1'],
    status: 'active',
    subscriberCount: 14,
    ...overrides,
  };
}

function mockResponses(plans: unknown[]) {
  mockApiClient.get.mockImplementation((url: string) => {
    if (url.includes('/membership-plans')) return Promise.resolve({ plans });
    if (url.includes('/class-types')) {
      return Promise.resolve({
        classTypes: [
          { id: 'ct-1', name: 'WOD', resultLoggable: true, resultMetric: 'time' },
          { id: 'ct-2', name: 'Yoga', resultLoggable: false, resultMetric: null },
        ],
      });
    }
    return Promise.resolve({});
  });
}

describe('PlansTab', () => {
  beforeEach(() => {
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
  });

  it('lists plans with price, cycle, class types and subscriber count', async () => {
    mockResponses([buildPlan()]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('Unlimited')).toBeTruthy();
    expect(screen.getByText('$120.00')).toBeTruthy();
    expect(screen.getByText('Monthly')).toBeTruthy();
    expect(screen.getByText('WOD')).toBeTruthy();
    expect(screen.getByText('14 members')).toBeTruthy();
  });

  it('shows the empty state when the gym has no plans', async () => {
    mockResponses([]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('No membership plans yet')).toBeTruthy();
  });

  it('marks an archived plan and hides its archive action', async () => {
    mockResponses([buildPlan({ status: 'archived' })]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('Archived')).toBeTruthy();
    expect(screen.queryByTestId('plan-archive-btn-plan-1')).toBeNull();
  });

  it('creates a plan from the form, sending cents', async () => {
    mockResponses([]);
    mockApiClient.post.mockResolvedValue({ id: 'plan-new' });

    render(<PlansTab {...DEFAULT_PROPS} />);

    fireEvent.press(await screen.findByTestId('add-plan-btn'));
    fireEvent.changeText(screen.getByTestId('plan-name-input'), 'Basic');
    fireEvent.changeText(screen.getByTestId('plan-price-input'), '75.50');
    fireEvent.press(screen.getByTestId('plan-class-type-pill-ct-1'));
    fireEvent.press(screen.getByTestId('plan-form-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/configuration/membership-plans',
        {
          name: 'Basic',
          pricing: 7550,
          billingCycle: 'monthly',
          classTypes: ['ct-1'],
        },
      );
    });
  });

  it('refuses to save a plan with no class types selected', async () => {
    mockResponses([]);

    render(<PlansTab {...DEFAULT_PROPS} />);

    fireEvent.press(await screen.findByTestId('add-plan-btn'));
    fireEvent.changeText(screen.getByTestId('plan-name-input'), 'Basic');
    fireEvent.changeText(screen.getByTestId('plan-price-input'), '75.50');
    fireEvent.press(screen.getByTestId('plan-form-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.post).not.toHaveBeenCalled();
    });
  });

  it('edits an existing plan', async () => {
    mockResponses([buildPlan()]);
    mockApiClient.patch.mockResolvedValue({ id: 'plan-1' });

    render(<PlansTab {...DEFAULT_PROPS} />);

    await screen.findByText('Unlimited');
    fireEvent.press(screen.getByTestId('plan-edit-btn-plan-1'));
    fireEvent.changeText(screen.getByTestId('plan-name-input'), 'Unlimited Plus');
    fireEvent.press(screen.getByTestId('plan-form-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/configuration/membership-plans/plan-1',
        expect.objectContaining({ name: 'Unlimited Plus' }),
      );
    });
  });

  it('renders an error with a retry action when loading fails', async () => {
    mockApiClient.get.mockRejectedValue(new Error('Network down'));

    render(<PlansTab {...DEFAULT_PROPS} />);

    expect(await screen.findByText('Network down')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });
});

// ─── Mobile register (isMobile: true) ──────────────────────────────────────────
//
// The desktop suite above renders the Table path. These cases render the
// CardList path instead and check what is genuinely different about it —
// no table header row — while confirming the per-row actions still reach
// the same testIDs and fire the same API calls as the desktop rendering.

const MOBILE_PROPS = { ...DEFAULT_PROPS, isMobile: true };

describe('PlansTab (mobile)', () => {
  beforeEach(() => {
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
    jest.spyOn(Alert, 'alert');
  });

  it('renders a card list, not a table, with the plan name, price, cycle and subscriber count', async () => {
    mockResponses([buildPlan()]);

    render(<PlansTab {...MOBILE_PROPS} />);

    expect(await screen.findByText('Unlimited')).toBeTruthy();
    // Table-only column header text — must be absent on the card path.
    expect(screen.queryByText('Actions')).toBeNull();
    expect(screen.queryByText('Members')).toBeNull();
    // Card-specific combined price/cycle line (distinct from the table's separate cells).
    expect(screen.getByText('$120.00 · Monthly')).toBeTruthy();
    expect(screen.getByText('14 members')).toBeTruthy();
    expect(screen.getByText('WOD')).toBeTruthy();
  });

  it('shows the same empty-state copy and testID as desktop', async () => {
    mockResponses([]);

    render(<PlansTab {...MOBILE_PROPS} />);

    expect(await screen.findByText('No membership plans yet')).toBeTruthy();
    expect(screen.getByTestId('add-plan-btn')).toBeTruthy();
  });

  it('marks an archived plan as a chip and hides its archive action on a card', async () => {
    mockResponses([buildPlan({ status: 'archived' })]);

    render(<PlansTab {...MOBILE_PROPS} />);

    expect(await screen.findByText('Archived')).toBeTruthy();
    expect(screen.queryByTestId('plan-archive-btn-plan-1')).toBeNull();
    expect(screen.queryByTestId('plan-edit-btn-plan-1')).toBeNull();
  });

  it('edits a plan from a card using the same testIDs and endpoint as desktop', async () => {
    mockResponses([buildPlan()]);
    mockApiClient.patch.mockResolvedValue({ id: 'plan-1' });

    render(<PlansTab {...MOBILE_PROPS} />);

    await screen.findByText('Unlimited');
    fireEvent.press(screen.getByTestId('plan-edit-btn-plan-1'));
    fireEvent.changeText(screen.getByTestId('plan-name-input'), 'Unlimited Plus');
    fireEvent.press(screen.getByTestId('plan-form-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/configuration/membership-plans/plan-1',
        expect.objectContaining({ name: 'Unlimited Plus' }),
      );
    });
  });

  it('archives a plan from a card after confirming, naming the subscriber count', async () => {
    mockResponses([buildPlan({ subscriberCount: 3 })]);
    mockApiClient.post.mockResolvedValue({ id: 'plan-1' });

    let confirmCallback: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _message, buttons) => {
      const archiveButton = buttons?.find((b) => b.style === 'destructive');
      confirmCallback = archiveButton?.onPress as (() => void) | undefined;
    });

    render(<PlansTab {...MOBILE_PROPS} />);

    await screen.findByText('Unlimited');
    fireEvent.press(screen.getByTestId('plan-archive-btn-plan-1'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Archive Plan',
      'You have 3 members on this plan. They keep it until it expires, but nobody new can be assigned to it.',
      expect.any(Array),
    );

    await confirmCallback?.();

    await waitFor(() => {
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/configuration/membership-plans/plan-1/archive',
        {},
      );
    });
  });
});
