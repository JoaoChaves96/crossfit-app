/**
 * Tests for the athlete-facing Schedule screen ((tabs)/schedule.tsx).
 *
 * This screen fetches the gym class schedule and the user's bookings, then
 * derives a per-card booking status (open / booked / waitlisted / full) and
 * renders the appropriate badge and action button on each ClassCard.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import ScheduleScreen from '@/app/(tabs)/schedule';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { createMockApiClient } from '@/test-utils/mock-api-client';
import { components } from '@/types/api.gen';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

// Notification state lives in an app-wide provider not mounted in these tests;
// stub it so NotificationBell renders without a NotificationsProvider.
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

// GymSwitcher fetches independently via the same mocked api client this suite
// uses for the schedule itself; stub it out so its own request doesn't
// consume this suite's per-call mockResolvedValueOnce queue. GymSwitcher.test.tsx
// owns its behavior.
jest.mock('@/components/GymSwitcher', () => ({
  GymSwitcher: () => null,
}));

// expo-router global mock (jest-setup.ts) omits useFocusEffect which is
// imported by schedule.tsx. Override here to include it.
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  // DesktopTopNav (desktop register only) marks its active item via usePathname.
  usePathname: jest.fn(() => '/(tabs)/schedule'),
  // Invoke the callback via React.useEffect so async state updates happen
  // after the component mounts, matching the real useFocusEffect timing.
  useFocusEffect: jest.fn((cb: () => void) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(cb, []);
  }),
  Link: jest.fn(({ children }: { children: unknown }) => children),
  Redirect: jest.fn(() => null),
  Stack: { Screen: jest.fn(() => null) },
  Tabs: { Screen: jest.fn(() => null) },
}));

import { createApiClient } from '@/utils/api-client';

// jsdom's window is 750px wide, which is under the 768px mobile breakpoint, so
// an unpinned suite silently tests the mobile register only. Pin it, and let
// the desktop describe block opt in — the desktop register is a separate return
// with its own top nav and a 3-column grid that mobile has no equivalent for.
let mockIsDesktop = false;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: !mockIsDesktop, isDesktop: mockIsDesktop, width: mockIsDesktop ? 1280 : 390 }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

type GymClass = components['schemas']['ClassScheduleItemDto'];
type UserBookingItem = components['schemas']['UserBookingItemDto'];

// ─── Data factories ───────────────────────────────────────────────────────────

function buildGymClass(overrides?: Partial<GymClass>): GymClass {
  return {
    id: 'class-1',
    classTypeId: 'ct-1',
    classTypeName: 'CrossFit',
    scheduledDate: '2025-05-06',
    scheduledTime: '07:00',
    coachUserId: 'coach-1',
    coachName: 'Jane Smith',
    capacity: 20,
    duration: 60,
    bookedCount: 10,
    spaceId: 'space-1',
    spaceName: 'Main Floor',
    state: 'published',
    ...overrides,
  };
}

function buildUserBooking(overrides?: Partial<UserBookingItem>): UserBookingItem {
  return {
    id: 'booking-1',
    classId: 'class-1',
    status: 'booked',
    waitlistPosition: null,
    ...overrides,
  };
}

function buildScheduleResponse(classes: GymClass[]) {
  return { classes };
}

/** Today's local date as "YYYY-MM-DD" (mirrors the screen's Day-view logic). */
function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function buildBookingsResponse(bookings: UserBookingItem[]) {
  return { bookings };
}

// ─── Render helpers ───────────────────────────────────────────────────────────

const AUTH_CONTEXT: AuthContextType = {
  user: { id: 'user-1', email: 'athlete@example.com', role: 'athlete', gymId: 'gym-1' },
  token: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
};

const GYM_CONTEXT = {
  currentGymId: 'gym-1',
  isLoading: false,
  setCurrentGymId: jest.fn(),
  switchGym: jest.fn(),
};

function renderScreen(mockApi = createMockApiClient()) {
  (createApiClient as jest.Mock).mockReturnValue(mockApi);

  return render(
    <AuthContext.Provider value={AUTH_CONTEXT}>
      <GymContext.Provider value={GYM_CONTEXT}>
        <ScheduleScreen />
      </GymContext.Provider>
    </AuthContext.Provider>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Top-level, so every describe below starts in the mobile register regardless of
// what an earlier block pinned.
beforeEach(() => {
  mockIsDesktop = false;
});

describe('ScheduleScreen — booking status badges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Open status ────────────────────────────────────────────────────────────

  describe('when class has available spots and user has no booking', () => {
    it('renders the "Open" badge', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([buildGymClass({ bookedCount: 5, capacity: 20 })]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Open')).toBeTruthy();
      });
    });

    it('renders the "Book Class" action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([buildGymClass({ bookedCount: 5, capacity: 20 })]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Book Class')).toBeTruthy();
      });
    });
  });

  // ── Booked status ──────────────────────────────────────────────────────────

  describe('when user has a confirmed booking for the class', () => {
    it('renders the "Booked" badge', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({ id: 'class-booked', bookedCount: 8, capacity: 20 });
      const booking = buildUserBooking({ classId: 'class-booked', status: 'booked' });

      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([booking]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Booked')).toBeTruthy();
      });
    });

    it('renders the "Cancel Booking" action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({ id: 'class-booked', bookedCount: 8, capacity: 20 });
      const booking = buildUserBooking({ classId: 'class-booked', status: 'booked' });

      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([booking]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Cancel Booking')).toBeTruthy();
      });
    });
  });

  // ── Full status ────────────────────────────────────────────────────────────

  describe('when class is at full capacity and user has no booking', () => {
    it('renders the "Full" badge', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({ id: 'class-full', bookedCount: 20, capacity: 20 });

      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Full')).toBeTruthy();
      });
    });

    it('renders the "Join Waitlist" action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({ id: 'class-full', bookedCount: 20, capacity: 20 });

      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Join Waitlist')).toBeTruthy();
      });
    });
  });

  // ── Waitlisted status ──────────────────────────────────────────────────────

  describe('when user is on the waitlist for the class', () => {
    it('renders the "Waitlisted" badge', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({ id: 'class-waitlisted', bookedCount: 20, capacity: 20 });
      const booking = buildUserBooking({
        classId: 'class-waitlisted',
        status: 'waitlisted',
        waitlistPosition: 2,
      });

      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([booking]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Waitlisted')).toBeTruthy();
      });
    });

    it('renders the "Leave Waitlist" action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({ id: 'class-waitlisted', bookedCount: 20, capacity: 20 });
      const booking = buildUserBooking({
        classId: 'class-waitlisted',
        status: 'waitlisted',
        waitlistPosition: 1,
      });

      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([booking]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Leave Waitlist')).toBeTruthy();
      });
    });
  });
});

// ─── Lifecycle-state gating ─────────────────────────────────────────────────
//
// Only `published` classes may offer a booking/waitlist action. Non-published
// classes (booking_closed / in_progress / completed) render a display-only
// status badge and no action button, mirroring the gating in class-details.

describe('ScheduleScreen — lifecycle-state gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when a published open class has no user booking', () => {
    it('renders the "Book Class" action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({
        id: 'class-published',
        state: 'published',
        bookedCount: 5,
        capacity: 20,
      });
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Book Class')).toBeTruthy();
      });
    });
  });

  describe('when a booking_closed class has no user booking', () => {
    it('renders the "Closed" badge', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({
        id: 'class-closed',
        state: 'booking_closed',
        bookedCount: 5,
        capacity: 20,
      });
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Closed')).toBeTruthy();
      });
    });

    it('does not render any booking action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({
        id: 'class-closed',
        state: 'booking_closed',
        bookedCount: 5,
        capacity: 20,
      });
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Closed')).toBeTruthy();
      });
      expect(screen.queryByText('Book Class')).toBeNull();
      expect(screen.queryByText('Join Waitlist')).toBeNull();
    });
  });

  describe('when an in_progress class has no user booking', () => {
    it('renders the "In Progress" badge and no action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({
        id: 'class-in-progress',
        state: 'in_progress',
        bookedCount: 12,
        capacity: 20,
      });
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('In Progress')).toBeTruthy();
      });
      expect(screen.queryByText('Book Class')).toBeNull();
      expect(screen.queryByText('Join Waitlist')).toBeNull();
    });
  });

  describe('when a completed class has no user booking', () => {
    it('renders the "Completed" badge and no action button', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({
        id: 'class-completed',
        state: 'completed',
        bookedCount: 18,
        capacity: 20,
      });
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeTruthy();
      });
      expect(screen.queryByText('Book Class')).toBeNull();
      expect(screen.queryByText('Join Waitlist')).toBeNull();
    });
  });

  describe('when a full but non-published class has no user booking', () => {
    it('does not offer "Join Waitlist" (renders lifecycle badge instead)', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({
        id: 'class-completed-full',
        state: 'completed',
        bookedCount: 20,
        capacity: 20,
      });
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeTruthy();
      });
      expect(screen.queryByText('Join Waitlist')).toBeNull();
      expect(screen.queryByText('Full')).toBeNull();
    });
  });

  describe('when a user has a confirmed booking on a non-published class', () => {
    it('still reflects the "Booked" status regardless of lifecycle state', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const cls = buildGymClass({
        id: 'class-completed-booked',
        state: 'completed',
        bookedCount: 15,
        capacity: 20,
      });
      const booking = buildUserBooking({
        classId: 'class-completed-booked',
        status: 'booked',
      });
      mockApi.get.mockImplementation((url: string) => {
        if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
        if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([booking]));
        return Promise.reject(new Error(`Unexpected GET: ${url}`));
      });

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Booked')).toBeTruthy();
      });
    });
  });
});

// ─── Controls: Week/Day toggle + class-type filter chips ─────────────────────
//
// The Controls area (design frame wUe5e / node NzxqW) sits below the header and
// provides a Week/Day segmented toggle and a row of class-type filter chips.
// Filtering is client-side over the already-fetched classes.

describe('ScheduleScreen — class-type filter chips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockTwoTypes() {
    const mockApi = createMockApiClient();
    const crossfit = buildGymClass({ id: 'c-cf', classTypeName: 'CrossFit', scheduledTime: '07:00' });
    const gymnastics = buildGymClass({ id: 'c-gym', classTypeName: 'Gymnastics', scheduledTime: '09:00' });
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([crossfit, gymnastics]));
      if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
      return Promise.reject(new Error(`Unexpected GET: ${url}`));
    });
    return mockApi;
  }

  it('renders the canonical class-type chips', async () => {
    // Arrange
    const mockApi = mockTwoTypes();

    // Act
    renderScreen(mockApi);

    // Assert (chips carry testIDs; class-type text also appears on cards)
    await waitFor(() => {
      expect(screen.getByTestId('schedule-chip-All')).toBeTruthy();
    });
    expect(screen.getByTestId('schedule-chip-CrossFit')).toBeTruthy();
    expect(screen.getByTestId('schedule-chip-Gymnastics')).toBeTruthy();
    expect(screen.getByTestId('schedule-chip-Hyrox')).toBeTruthy();
  });

  it('shows all class types when "All" is selected (default)', async () => {
    // Arrange
    const mockApi = mockTwoTypes();

    // Act
    renderScreen(mockApi);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('07:00 – 08:00')).toBeTruthy();
    });
    expect(screen.getByText('09:00 – 10:00')).toBeTruthy();
  });

  it('filters the list to the selected class type', async () => {
    // Arrange
    const mockApi = mockTwoTypes();
    renderScreen(mockApi);
    await waitFor(() => {
      expect(screen.getByText('09:00 – 10:00')).toBeTruthy();
    });

    // Act — select the "Gymnastics" chip
    fireEvent.press(screen.getByTestId('schedule-chip-Gymnastics'));

    // Assert — CrossFit class (07:00) hidden, Gymnastics class (09:00) shown
    await waitFor(() => {
      expect(screen.queryByText('07:00 – 08:00')).toBeNull();
    });
    expect(screen.getByText('09:00 – 10:00')).toBeTruthy();
  });
});

describe('ScheduleScreen — Week/Day toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('narrows the list to today\'s classes when "Day" is selected', async () => {
    // Arrange — one class today, one on a fixed past date
    const mockApi = createMockApiClient();
    const todayClass = buildGymClass({ id: 'c-today', scheduledDate: todayIso(), scheduledTime: '07:00' });
    const otherDayClass = buildGymClass({ id: 'c-other', scheduledDate: '2025-05-06', scheduledTime: '09:00' });
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([todayClass, otherDayClass]));
      if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse([]));
      return Promise.reject(new Error(`Unexpected GET: ${url}`));
    });
    renderScreen(mockApi);
    await waitFor(() => {
      expect(screen.getByText('09:00 – 10:00')).toBeTruthy();
    });

    // Act — switch to Day view
    fireEvent.press(screen.getByTestId('schedule-toggle-day'));

    // Assert — only today's class remains
    await waitFor(() => {
      expect(screen.queryByText('09:00 – 10:00')).toBeNull();
    });
    expect(screen.getByText('07:00 – 08:00')).toBeTruthy();
  });
});

// ─── Desktop register ─────────────────────────────────────────────────────────

// The desktop register is a separate early return: a DesktopTopNav plus a
// three-column card grid, where mobile renders a tab bar and a single-column
// FlatList. Nothing below has a mobile equivalent, so it had no coverage at all.
describe('ScheduleScreen — desktop register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDesktop = true;
  });

  function mockSchedule(classes: GymClass[], bookings: UserBookingItem[] = []) {
    const mockApi = createMockApiClient();
    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse(classes));
      if (url.includes('/bookings')) return Promise.resolve(buildBookingsResponse(bookings));
      return Promise.reject(new Error(`Unexpected GET: ${url}`));
    });
    return mockApi;
  }

  it('renders the desktop top nav instead of the mobile tab bar', async () => {
    // Arrange
    const mockApi = mockSchedule([buildGymClass()]);

    // Act
    renderScreen(mockApi);

    // Assert — all four top-nav destinations are present
    await waitFor(() => {
      expect(screen.getByText('Schedule')).toBeTruthy();
    });
    expect(screen.getByText('My Bookings')).toBeTruthy();
    expect(screen.getByText('Training History')).toBeTruthy();
    expect(screen.getByText('Profile')).toBeTruthy();
  });

  it('distributes every class across the three grid columns without dropping any', async () => {
    // Arrange — 7 classes on one date exercises the round-robin's uneven tail
    // (columns get 3 / 2 / 2). All share a date so they land in one grid.
    // Identify them by start time, not class type: classTypeName also feeds the
    // filter chip row, so a distinct name per class would match twice.
    const classes = Array.from({ length: 7 }, (_, i) =>
      buildGymClass({
        id: `class-${i}`,
        scheduledDate: '2025-05-06',
        scheduledTime: `0${i + 1}:00`,
      })
    );
    const mockApi = mockSchedule(classes);

    // Act
    renderScreen(mockApi);

    // Assert — every class is on screen exactly once; the grid partitions, it
    // does not duplicate or truncate.
    await waitFor(() => {
      expect(screen.getByText('01:00 – 02:00')).toBeTruthy();
    });
    for (let i = 0; i < 7; i++) {
      expect(screen.getAllByText(`0${i + 1}:00 – 0${i + 2}:00`)).toHaveLength(1);
    }
  });

  it('still derives booking status per card in the grid', async () => {
    // Arrange — a booked class and a full one, so the status badges the mobile
    // suite covers are proven to survive the grid path too
    const mockApi = mockSchedule(
      [
        buildGymClass({ id: 'booked-cls', scheduledDate: '2025-05-06', bookedCount: 5, capacity: 20 }),
        buildGymClass({ id: 'full-cls', scheduledDate: '2025-05-06', bookedCount: 20, capacity: 20, classTypeName: 'Olympic Lifting' }),
      ],
      [buildUserBooking({ classId: 'booked-cls', status: 'booked' })]
    );

    // Act
    renderScreen(mockApi);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Booked')).toBeTruthy();
    });
    expect(screen.getByText('Full')).toBeTruthy();
  });

  it('shows the filtered-empty message when no class matches the active filter', async () => {
    // Arrange — the only class is a CrossFit one. Note Day view cannot produce
    // this state: it deliberately falls back to the nearest day that has
    // classes, so a class-type chip that matches nothing is the way in.
    const mockApi = mockSchedule([buildGymClass({ classTypeId: 'ct-1', classTypeName: 'CrossFit' })]);
    renderScreen(mockApi);
    await waitFor(() => {
      expect(screen.getByTestId('schedule-chip-Gymnastics')).toBeTruthy();
    });

    // Act — filter to a canonical type that no loaded class has
    fireEvent.press(screen.getByTestId('schedule-chip-Gymnastics'));

    // Assert
    await waitFor(() => {
      expect(screen.getByText('No classes match the selected filters.')).toBeTruthy();
    });
  });
});
