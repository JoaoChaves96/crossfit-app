import React from 'react';
import { render, screen } from '@testing-library/react-native';

let mockIsDesktop = true;

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({
    isMobile: !mockIsDesktop,
    isDesktop: mockIsDesktop,
    width: mockIsDesktop ? 1280 : 390,
  }),
}));

const mockApiClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() };

jest.mock('@/utils/api-client', () => ({ createApiClient: () => mockApiClient }));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ token: 'test-token', isLoading: false }),
}));
jest.mock('@/hooks/useGym', () => ({
  useGym: () => ({ currentGymId: 'gym-abc', isLoading: false }),
}));

// Notification state lives in an app-wide provider not mounted in these
// tests; stub it so NotificationBell renders without a NotificationsProvider
// (copied from the existing schedule test suite).
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

jest.mock('@/utils/alert', () => ({
  showConfirm: jest.fn(),
  showError: jest.fn(),
  showAlert: jest.fn(),
}));

// expo-router global mock (jest-setup.ts) omits useFocusEffect which is
// imported by schedule.tsx. Override here to include it (copied from the
// existing schedule test suite).
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/(tabs)/schedule'),
  useFocusEffect: jest.fn((cb: () => void) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(cb, []);
  }),
  Link: jest.fn(({ children }: { children: unknown }) => children),
  Redirect: jest.fn(() => null),
  Stack: { Screen: jest.fn(() => null) },
  Tabs: { Screen: jest.fn(() => null) },
}));

import ScheduleScreen from '@/app/(tabs)/schedule';

function scheduleResponse(planExpiresAt: string | null) {
  return {
    gymName: 'CrossFit Downtown',
    planExpiresAt,
    classes: [],
  };
}

function mockSchedule(planExpiresAt: string | null) {
  mockApiClient.get.mockImplementation((url: string) => {
    if (url.includes('/classes')) return Promise.resolve(scheduleResponse(planExpiresAt));
    return Promise.resolve({ bookings: [] });
  });
}

// A non-empty schedule so the note is exercised at its real injection points
// (desktop ScrollView tail / mobile FlatList footer) rather than the
// top-level "no classes at all" empty-state branch the three tests above all
// land in. Date is relative to today, not hardcoded, per project convention.
const CLASS_DATE = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
const CLASS_DAY = CLASS_DATE.toISOString().slice(0, 10);

function scheduleResponseWithClass(planExpiresAt: string | null) {
  return {
    gymName: 'CrossFit Downtown',
    planExpiresAt,
    classes: [
      {
        id: 'class-1',
        classTypeId: 'ct-1',
        classTypeName: 'CrossFit',
        scheduledDate: CLASS_DAY,
        scheduledTime: '07:00',
        coachUserId: 'coach-1',
        coachName: 'Jane Smith',
        capacity: 20,
        duration: 60,
        bookedCount: 10,
        spaceId: 'space-1',
        spaceName: 'Main Floor',
        state: 'published',
      },
    ],
  };
}

function mockScheduleWithClass(planExpiresAt: string | null) {
  mockApiClient.get.mockImplementation((url: string) => {
    if (url.includes('/classes')) return Promise.resolve(scheduleResponseWithClass(planExpiresAt));
    return Promise.resolve({ bookings: [] });
  });
}

// Task 8 returns planExpiresAt as a bare YYYY-MM-DD day string, not a
// timestamp. Held to that contract here, and computed relative to today so the
// fixture cannot drift into the past.
const CUTOFF_DATE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
const CUTOFF_DAY = CUTOFF_DATE.toISOString().slice(0, 10);
const CUTOFF_LABEL = `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][CUTOFF_DATE.getUTCMonth()]} ${CUTOFF_DATE.getUTCDate()}, ${CUTOFF_DATE.getUTCFullYear()}`;
const CUTOFF_COPY = `Your plan covers classes through ${CUTOFF_LABEL}. Talk to your coach to renew.`;

describe('Schedule plan cutoff note', () => {
  beforeEach(() => {
    mockIsDesktop = true;
    Object.values(mockApiClient).forEach((fn) => fn.mockReset());
  });

  it('shows the cutoff note on desktop when the plan has an expiry', async () => {
    mockSchedule(CUTOFF_DAY);

    render(<ScheduleScreen />);

    expect(await screen.findByText(CUTOFF_COPY)).toBeTruthy();
  });

  it('shows the cutoff note on mobile too', async () => {
    mockIsDesktop = false;
    mockSchedule(CUTOFF_DAY);

    render(<ScheduleScreen />);

    expect(await screen.findByText(CUTOFF_COPY)).toBeTruthy();
  });

  it('shows nothing when the plan has no expiry', async () => {
    mockSchedule(null);

    render(<ScheduleScreen />);

    // The fixture's schedule response always returns classes: [], which
    // renders the screen's top-level "no classes at all" empty state rather
    // than the filtered-empty message — sync on that state's actual text
    // before asserting the cutoff note is absent.
    await screen.findByText('No classes scheduled');
    expect(screen.queryByText(/Your plan covers classes through/)).toBeNull();
  });

  // The three tests above all resolve to the shared top-level empty-state
  // branch (the fixture's classes are always []), so none of them prove the
  // note actually renders at either of the two real injection points named
  // in the brief: the desktop ScrollView tail and the mobile FlatList
  // footer. These two use a populated class list and assert the class's own
  // (unique) content alongside the cutoff copy, so a test that lands in the
  // empty-state branch instead would fail here — it would never see
  // "Jane Smith".

  it('shows the cutoff note after the desktop date groups, alongside real classes', async () => {
    mockScheduleWithClass(CUTOFF_DAY);

    render(<ScheduleScreen />);

    // Proves this test reached the populated desktop ScrollView path, not
    // the empty-state branch.
    expect(await screen.findByText('Jane Smith')).toBeTruthy();
    expect(await screen.findByText(CUTOFF_COPY)).toBeTruthy();
  });

  it('shows the cutoff note as the mobile list footer, alongside real classes', async () => {
    mockIsDesktop = false;
    mockScheduleWithClass(CUTOFF_DAY);

    render(<ScheduleScreen />);

    // Proves this test reached the populated mobile FlatList path, not the
    // empty-state branch.
    expect(await screen.findByText('Jane Smith')).toBeTruthy();
    expect(await screen.findByText(CUTOFF_COPY)).toBeTruthy();
  });
});
