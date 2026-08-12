import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

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

import { MemberDetailsPanel, nextCycleDate } from '@/components/MemberDetailsPanel';

/**
 * The +1-cycle default and the past-date guard both compare against "now", so
 * the fixture's expiry is pinned relative to today rather than hardcoded — a
 * hardcoded date would silently start testing the lapsed branch once real time
 * passed it. Fake timers are deliberately avoided: they deadlock `waitFor`,
 * which polls on real timers.
 */
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const FUTURE_EXPIRY = new Date(Date.now() + YEAR_MS);
const FUTURE_EXPIRY_ISO = FUTURE_EXPIRY.toISOString();

/**
 * Mirrors the implementation's `nextCycleDate` — advancing via the UTC
 * accessors, not their local-time counterparts. Using local `getMonth`/
 * `setMonth` here would make this fixture agree with a local-time
 * implementation too whenever the run happens not to straddle a UTC/local
 * day boundary, which defeats the point of a discriminating test. See the
 * comment on `nextCycleDate` in MemberDetailsPanel.tsx for the bug this
 * guards against (this project has hit it twice already with `expiresAt`).
 */
function oneMonthAfter(date: Date): string {
  let year = date.getUTCFullYear();
  let month = date.getUTCMonth() + 1;
  if (month > 11) {
    month = 0;
    year += 1;
  }
  // Clamped like the implementation, so this fixture stays correct if the run
  // date ever lands on the 29th-31st. Bare setUTCMonth would overflow there.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

const member = {
  id: 'gm-1',
  userId: 'user-1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  status: 'active' as const,
  joinedAt: '2026-01-15T10:00:00.000Z',
  planId: 'plan-1',
  planName: 'Unlimited',
  expiresAt: FUTURE_EXPIRY_ISO,
  membershipStatus: 'active' as const,
  autoRoll: true,
  autoRollCount: 2,
};

const plansResponse = {
  plans: [
    { id: 'plan-1', name: 'Unlimited', pricing: 15000, billingCycle: 'monthly', classTypes: [], status: 'active', subscriberCount: 4 },
    { id: 'plan-2', name: '3x / week', pricing: 11000, billingCycle: 'monthly', classTypes: [], status: 'active', subscriberCount: 2 },
  ],
};

describe('nextCycleDate (UTC vs local-time discrimination)', () => {
  /**
   * A fixture picked to disagree between a UTC-safe implementation and a
   * local-time one on any host with a non-zero offset in the right
   * direction — not just to happen to pass under both, which would prove
   * nothing. 23:30 UTC on the last day of August: a positive-offset host
   * (this dev machine is UTC+1/WEST) reads that instant as September 1st
   * locally, so `getMonth`/`setMonth` would advance from September instead
   * of August, landing one calendar month later than the UTC-correct
   * answer. Confirmed by temporarily swapping the implementation's UTC
   * accessors back to their local counterparts and re-running this test: it
   * fails (produces '2027-10-01' instead of '2027-09-30').
   */
  it('advances from the UTC calendar date, not the local one', () => {
    const expiresAt = '2027-08-31T23:30:00.000Z';
    expect(nextCycleDate(expiresAt, 'monthly')).toBe('2027-09-30');
  });

  /**
   * Month-end clamping, mirroring RULING B and `addCycle` in
   * backend/src/domain/athlete-membership-plan/billing-cycle.ts. Unclamped
   * setUTCMonth overflows a short month — Jan 31 lands on Mar 3 — so the date
   * the owner is offered on the "+1 cycle" button skips a month entirely.
   * Exact dates, because a loose bound cannot see a skipped month.
   */
  describe('month-end clamping', () => {
    it('clamps Jan 31 to Feb 28, not into March', () => {
      expect(nextCycleDate('2027-01-31T10:00:00.000Z', 'monthly')).toBe('2027-02-28');
    });

    it('clamps Jan 31 to Feb 29 in a leap year', () => {
      expect(nextCycleDate('2028-01-31T10:00:00.000Z', 'monthly')).toBe('2028-02-29');
    });

    it('clamps Aug 31 to Sep 30, not into October', () => {
      expect(nextCycleDate('2027-08-31T10:00:00.000Z', 'monthly')).toBe('2027-09-30');
    });

    it('clamps an annual Feb 29 to Feb 28 of the common year', () => {
      expect(nextCycleDate('2028-02-29T10:00:00.000Z', 'annual')).toBe('2029-02-28');
    });

    it('rolls a December month-end into January of the next year', () => {
      expect(nextCycleDate('2027-12-31T10:00:00.000Z', 'monthly')).toBe('2028-01-31');
    });

    it('leaves a mid-month date on the same day of the next month', () => {
      expect(nextCycleDate('2027-03-15T10:00:00.000Z', 'monthly')).toBe('2027-04-15');
    });
  });

  /**
   * A null expiry (unlimited plan) still means "one cycle from today" — the
   * lapsed/absent branch — and the clamping must not disturb that.
   */
  it('advances from today when there is no stored expiry', () => {
    expect(nextCycleDate(null, 'monthly')).toBe(oneMonthAfter(new Date()));
  });
});

function renderPanel(overrides = {}) {
  const onClose = jest.fn();
  const onChanged = jest.fn();
  render(
    <MemberDetailsPanel member={{ ...member, ...overrides }} onClose={onClose} onChanged={onChanged} />,
  );
  return { onClose, onChanged };
}

describe('MemberDetailsPanel', () => {
  beforeEach(() => {
    mockIsMobile = false;
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
    mockApiClient.get.mockResolvedValue(plansResponse);
  });

  it('shows the member name, current plan and auto-renew count', async () => {
    renderPanel();

    expect(await screen.findByText('Jane Doe')).toBeTruthy();
    expect(screen.getByText('jane@example.com')).toBeTruthy();
    expect(screen.getByText('Renewed 2× since you last confirmed')).toBeTruthy();
  });

  it('extends the expiry date', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'amp-1' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('member-expiry-input'), '2030-12-31');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/expiry',
        { expiresAt: '2030-12-31' },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('fills one billing cycle past the current expiry when +1 cycle is pressed', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'amp-1' });
    renderPanel();

    await screen.findByText('Jane Doe');
    // The billing cycle used by "+1 cycle" comes from the plans list fetch,
    // which resolves asynchronously — wait for the plan picker to reflect it
    // before pressing the button, or the press can land while `currentPlan`
    // is still null and silently no-op.
    await screen.findByText('Unlimited');
    fireEvent.press(screen.getByTestId('member-add-cycle-btn'));
    fireEvent.press(screen.getByTestId('member-save-btn'));

    // The plan is monthly and the fixture expiry is a year out, so the cycle
    // runs from the expiry (not from today) and lands one month later.
    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/expiry',
        { expiresAt: oneMonthAfter(FUTURE_EXPIRY) },
      );
    });
  });

  it('rejects a malformed expiry date without calling the API', async () => {
    renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('member-expiry-input'), '31/12/2026');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    expect(await screen.findByText('Use the format YYYY-MM-DD.')).toBeTruthy();
    expect(mockApiClient.patch).not.toHaveBeenCalled();
  });

  it('assigns a different plan', async () => {
    mockApiClient.put.mockResolvedValue({ id: 'amp-2' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    await screen.findByText('Unlimited');
    fireEvent.press(screen.getByTestId('member-plan-select'));
    fireEvent.press(screen.getByText('3x / week'));
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.put).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/plan',
        { membershipPlanId: 'plan-2' },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('toggles auto-renew off', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'amp-1' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-auto-roll-toggle'));
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/membership/auto-roll',
        { autoRoll: false },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('suspends an active member', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'gm-1', status: 'inactive' });
    const { onChanged } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-suspend-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/status',
        { status: 'inactive' },
      );
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it('offers Resume for a suspended member', async () => {
    mockApiClient.patch.mockResolvedValue({ id: 'gm-1', status: 'active' });
    renderPanel({ status: 'inactive', membershipStatus: 'inactive' });

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-resume-btn'));

    await waitFor(() => {
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/gyms/gym-abc/members/gm-1/status',
        { status: 'active' },
      );
    });
  });

  it('sends only the fields that changed', async () => {
    renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeTruthy();
    });
    expect(mockApiClient.patch).not.toHaveBeenCalled();
    expect(mockApiClient.put).not.toHaveBeenCalled();
  });

  it('surfaces a backend error message', async () => {
    mockApiClient.patch.mockRejectedValue(new Error('Membership expiry must be in the future'));
    renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.changeText(screen.getByTestId('member-expiry-input'), '2020-01-01');
    fireEvent.press(screen.getByTestId('member-save-btn'));

    expect(await screen.findByText('Membership expiry must be in the future')).toBeTruthy();
  });

  it('hides the plan and expiry controls for a member with no plan', async () => {
    renderPanel({ planId: null, planName: null, expiresAt: null, membershipStatus: 'expired' });

    await screen.findByText('Jane Doe');
    expect(screen.queryByTestId('member-expiry-input')).toBeNull();
    expect(screen.getByTestId('member-plan-select')).toBeTruthy();
    expect(screen.getByText('No plan assigned')).toBeTruthy();
  });
});

/**
 * Mobile register — the desktop tests above already cover every branch of
 * business logic (the four actions, validation, +1-cycle math), which the
 * mobile Modal shares unchanged. What's genuinely different on mobile is the
 * sheet shell itself: it mounts as a Modal, and it has its own dismissal
 * logic — the backdrop press closes it, but a press on the sheet body must
 * NOT (that's the `stopPropagation` in MemberDetailsSheet). That dismissal
 * logic is branching behaviour, not styling, so it gets its own coverage
 * rather than being asserted only by construction.
 */
describe('MemberDetailsPanel — mobile register', () => {
  beforeEach(() => {
    mockIsMobile = true;
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
    mockApiClient.get.mockResolvedValue(plansResponse);
  });

  it('renders as a Modal bottom sheet', async () => {
    renderPanel();

    await screen.findByText('Jane Doe');
    expect(screen.getByTestId('member-sheet-backdrop')).toBeTruthy();
    expect(screen.getByTestId('member-sheet-body')).toBeTruthy();
  });

  it('dismisses when the backdrop is pressed', async () => {
    const { onClose } = renderPanel();

    await screen.findByText('Jane Doe');
    fireEvent.press(screen.getByTestId('member-sheet-backdrop'));

    expect(onClose).toHaveBeenCalled();
  });

  it('does not dismiss when the sheet body itself is pressed', async () => {
    const { onClose } = renderPanel();

    await screen.findByText('Jane Doe');
    // RNTL's fireEvent.press calls the target's own onPress directly — it
    // never simulates real event bubbling, so it cannot exercise what
    // stopPropagation is actually for (stopping a press from reaching the
    // backdrop underneath). This asserts the handler's contract instead:
    // given an event, MemberDetailsSheet's body onPress must call
    // stopPropagation on it. That's weaker than a genuine bubbling test, but
    // it fails if the `e.stopPropagation()` call is ever removed — do not
    // "simplify" this back into a plain fireEvent.press with no event arg,
    // that would pass whether or not the guard exists.
    const stopPropagation = jest.fn();
    fireEvent.press(screen.getByTestId('member-sheet-body'), { stopPropagation });

    expect(stopPropagation).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
