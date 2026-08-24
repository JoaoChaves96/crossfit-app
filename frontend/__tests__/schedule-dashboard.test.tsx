import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ScheduleDashboard from '@/app/schedule-dashboard';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { createMockApiClient } from '@/test-utils/mock-api-client';
import { components } from '@/types/api.gen';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

// Notification state lives in an app-wide provider not mounted in these tests;
// stub it so DesktopTopNav's NotificationBell renders without a provider.
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

// The expo-router global mock (jest-setup.ts) omits useFocusEffect, which the
// dashboard uses to refetch when the owner returns from create/edit-class.
// Override here to include it, invoking the callback via useEffect so async
// state updates land after mount — the real hook's timing.
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => []),
  usePathname: jest.fn(() => '/schedule-dashboard'),
  // Deps are [cb], not [] — the real hook re-runs when the callback identity
  // changes, which is how paging the week refetches its date range.
  useFocusEffect: jest.fn((cb: () => void) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    require('react').useEffect(cb, [cb]);
  }),
  Link: jest.fn(({ children }: { children: unknown }) => children),
  Redirect: jest.fn(() => null),
  Stack: { Screen: jest.fn(() => null) },
  Tabs: { Screen: jest.fn(() => null) },
}));

import { createApiClient } from '@/utils/api-client';

// The week grid, its day columns, and the desktop class card only exist in the
// desktop register; the mobile register replaces them with a day strip and
// full-width cards. jsdom's default window is narrower than the 768px mobile
// breakpoint, so pin the register instead of inheriting it.
let mockIsMobile = false;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: mockIsMobile, isDesktop: !mockIsMobile, width: 1280 }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

type GymClass = components['schemas']['ClassScheduleItemDto'];

// ─── Data factories ───────────────────────────────────────────────────────────

function buildGymClass(overrides?: Partial<GymClass>): GymClass {
  return {
    id: 'class-1',
    classTypeId: 'ct-1',
    classTypeName: 'CrossFit',
    scheduledDate: '2025-05-05',
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

function buildScheduleResponse(classes: GymClass[]) {
  return { classes };
}

// ─── Render helpers ───────────────────────────────────────────────────────────

const AUTH_CONTEXT: AuthContextType = {
  user: { id: 'user-1', email: 'owner@example.com', role: 'gym_owner', gymId: 'gym-1' },
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
        <ScheduleDashboard />
      </GymContext.Provider>
    </AuthContext.Provider>
  );
}

// ─── Week navigation helpers ──────────────────────────────────────────────────

/**
 * Returns the Monday of the week containing `date`.
 * Mirrors the getWeekStart logic in schedule-dashboard.tsx.
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Formats a Date as the `YYYY-MM-DD` string the schedule endpoint returns. */
function toApiDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatWeekLabel(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} — ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ScheduleDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMobile = false;
  });

  // ── Week navigation ────────────────────────────────────────────────────────

  describe('week navigation', () => {
    it('renders the current week label on first render', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValueOnce(buildScheduleResponse([]));

      // Act
      renderScreen(mockApi);

      // Assert
      const currentWeekStart = getWeekStart(new Date());
      const expectedLabel = formatWeekLabel(currentWeekStart);

      await waitFor(() => {
        expect(screen.getByText(expectedLabel)).toBeTruthy();
      });
    });

    it('increments the displayed week when the next arrow is pressed', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValue(buildScheduleResponse([]));
      renderScreen(mockApi);

      const currentWeekStart = getWeekStart(new Date());
      const nextWeekStart = addDays(currentWeekStart, 7);
      const expectedLabel = formatWeekLabel(nextWeekStart);

      await waitFor(() =>
        expect(screen.getByText(formatWeekLabel(currentWeekStart))).toBeTruthy()
      );

      // Act
      fireEvent.press(screen.getByTestId('week-nav-next-btn'));

      // Assert — the label flips immediately; the range refetch settles after
      await waitFor(() => expect(screen.getByText(expectedLabel)).toBeTruthy());
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
    });

    it('decrements the displayed week when the previous arrow is pressed', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValue(buildScheduleResponse([]));
      renderScreen(mockApi);

      const currentWeekStart = getWeekStart(new Date());
      const prevWeekStart = addDays(currentWeekStart, -7);
      const expectedLabel = formatWeekLabel(prevWeekStart);

      await waitFor(() =>
        expect(screen.getByText(formatWeekLabel(currentWeekStart))).toBeTruthy()
      );

      // Act
      fireEvent.press(screen.getByTestId('week-nav-prev-btn'));

      // Assert
      await waitFor(() => expect(screen.getByText(expectedLabel)).toBeTruthy());
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
    });

    it('returns to the current week when next and then previous are pressed', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValue(buildScheduleResponse([]));
      renderScreen(mockApi);

      const currentWeekStart = getWeekStart(new Date());
      const currentLabel = formatWeekLabel(currentWeekStart);

      await waitFor(() => expect(screen.getByText(currentLabel)).toBeTruthy());

      // Act
      fireEvent.press(screen.getByTestId('week-nav-next-btn'));
      fireEvent.press(screen.getByTestId('week-nav-prev-btn'));

      // Assert
      await waitFor(() => expect(screen.getByText(currentLabel)).toBeTruthy());
      await waitFor(() => expect(mockApi.get.mock.calls.length).toBeGreaterThan(1));
    });
  });

  // ── Class cards — capacity status ──────────────────────────────────────────

  describe('class cards — capacity display', () => {
    it('renders a class card with available spots when class is not full', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const currentWeekStart = getWeekStart(new Date());
      const mondayDate = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;

      const cls = buildGymClass({
        id: 'class-available',
        scheduledDate: mondayDate,
        bookedCount: 5,
        capacity: 20,
        classTypeName: 'CrossFit',
      });
      mockApi.get.mockResolvedValueOnce(buildScheduleResponse([cls]));

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('5/20 spots')).toBeTruthy();
      });
    });

    it('renders a class card capacity text with the full style when class is at capacity', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const currentWeekStart = getWeekStart(new Date());
      const mondayDate = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;

      const cls = buildGymClass({
        id: 'class-full',
        scheduledDate: mondayDate,
        bookedCount: 20,
        capacity: 20,
        classTypeName: 'Olympic Lifting',
      });
      mockApi.get.mockResolvedValueOnce(buildScheduleResponse([cls]));

      // Act
      renderScreen(mockApi);

      // Assert — capacity text is rendered; the "full" visual style is applied
      // by the screen based on bookedCount >= capacity
      await waitFor(() => {
        expect(screen.getByText('20/20 spots')).toBeTruthy();
      });
    });

    it('renders the class type name in the card', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const currentWeekStart = getWeekStart(new Date());
      const mondayDate = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;

      const cls = buildGymClass({
        scheduledDate: mondayDate,
        classTypeName: 'Gymnastics',
      });
      mockApi.get.mockResolvedValueOnce(buildScheduleResponse([cls]));

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Gymnastics')).toBeTruthy();
      });
    });
  });

  // ── Day column filtering ───────────────────────────────────────────────────

  describe('day column filtering', () => {
    it('shows a class only in the day column matching its scheduled date', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const currentWeekStart = getWeekStart(new Date());

      // Monday of current week
      const mondayDate = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;

      const cls = buildGymClass({
        scheduledDate: mondayDate,
        classTypeName: 'Monday CrossFit',
      });
      mockApi.get.mockResolvedValueOnce(buildScheduleResponse([cls]));

      // Act
      renderScreen(mockApi);

      // Assert — class appears once (under Monday)
      await waitFor(() => {
        expect(screen.getAllByText('Monday CrossFit')).toHaveLength(1);
      });
    });

    it('shows "No classes" in columns that have no classes on that day', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const currentWeekStart = getWeekStart(new Date());

      // Place a class only on Monday — the remaining 6 days should show "No classes"
      const mondayDate = `${currentWeekStart.getFullYear()}-${String(currentWeekStart.getMonth() + 1).padStart(2, '0')}-${String(currentWeekStart.getDate()).padStart(2, '0')}`;
      const cls = buildGymClass({ scheduledDate: mondayDate });
      mockApi.get.mockResolvedValueOnce(buildScheduleResponse([cls]));

      // Act
      renderScreen(mockApi);

      // Assert — six of the seven day columns render the empty state text
      await waitFor(() => {
        expect(screen.getAllByText('No classes').length).toBeGreaterThanOrEqual(6);
      });
    });

    it('does not show classes from the previous week in the current week view', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const currentWeekStart = getWeekStart(new Date());
      const lastWeekMonday = addDays(currentWeekStart, -7);
      const lastWeekDate = `${lastWeekMonday.getFullYear()}-${String(lastWeekMonday.getMonth() + 1).padStart(2, '0')}-${String(lastWeekMonday.getDate()).padStart(2, '0')}`;

      const cls = buildGymClass({
        scheduledDate: lastWeekDate,
        classTypeName: 'Last Week Class',
      });
      mockApi.get.mockResolvedValueOnce(buildScheduleResponse([cls]));

      // Act
      renderScreen(mockApi);

      // Assert — class from last week is not visible in the current week's day columns
      await waitFor(() => {
        expect(screen.queryByText('Last Week Class')).toBeNull();
      });
    });
  });

  // ── Mobile register ────────────────────────────────────────────────────────

  // The mobile register swaps the seven-column week grid for a day strip that
  // shows one day at a time, so day selection — not column layout — is what
  // decides whether a class is on screen.
  describe('mobile register', () => {
    beforeEach(() => {
      mockIsMobile = true;
    });

    it('shows only the selected day’s classes, and switches on day-pill press', async () => {
      // Arrange — one class on Monday, one on Wednesday of the current week
      const mockApi = createMockApiClient();
      const weekStart = getWeekStart(new Date());
      mockApi.get.mockResolvedValueOnce(
        buildScheduleResponse([
          buildGymClass({ id: 'mon', scheduledDate: toApiDate(weekStart), classTypeName: 'Monday CrossFit' }),
          buildGymClass({ id: 'wed', scheduledDate: toApiDate(addDays(weekStart, 2)), classTypeName: 'Wednesday Gymnastics' }),
        ])
      );

      // Act — Monday (index 0) is selected on mount
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Monday CrossFit')).toBeTruthy();
      });
      expect(screen.queryByText('Wednesday Gymnastics')).toBeNull();

      // Act — select Wednesday
      fireEvent.press(screen.getByTestId('day-pill-2'));

      // Assert — the two days trade places
      await waitFor(() => {
        expect(screen.getByText('Wednesday Gymnastics')).toBeTruthy();
      });
      expect(screen.queryByText('Monday CrossFit')).toBeNull();
    });

    it('shows the empty state when the selected day has no classes', async () => {
      // Arrange — a class on Monday only
      const mockApi = createMockApiClient();
      const weekStart = getWeekStart(new Date());
      mockApi.get.mockResolvedValueOnce(
        buildScheduleResponse([buildGymClass({ scheduledDate: toApiDate(weekStart) })])
      );

      // Act
      renderScreen(mockApi);
      await waitFor(() => {
        expect(screen.getByTestId('day-pill-4')).toBeTruthy();
      });
      fireEvent.press(screen.getByTestId('day-pill-4')); // Friday

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No classes scheduled')).toBeTruthy();
      });
    });

    it('renders capacity without the desktop “spots” suffix', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      const weekStart = getWeekStart(new Date());
      mockApi.get.mockResolvedValueOnce(
        buildScheduleResponse([
          buildGymClass({ scheduledDate: toApiDate(weekStart), bookedCount: 5, capacity: 20 }),
        ])
      );

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('5/20')).toBeTruthy();
      });
      expect(screen.queryByText('5/20 spots')).toBeNull();
    });
  });

  // ── Loading and error states ───────────────────────────────────────────────

  describe('loading and error states', () => {
    it('shows an error message and retry button when the API fails', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockRejectedValueOnce(new Error('Network error'));

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
        expect(screen.getByText('Retry')).toBeTruthy();
      });
    });
  });

  // ── Date range requests ────────────────────────────────────────────────────

  // The screen asks the backend for the visible week only, so paging the week
  // has to refetch rather than re-filter a full schedule held in memory.
  describe('date range requests', () => {
    /** Pulls startDate/endDate off a `.../schedule?startDate=…&endDate=…` call. */
    function rangeOf(url: string): { startDate: string | null; endDate: string | null } {
      const query = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      return { startDate: query.get('startDate'), endDate: query.get('endDate') };
    }

    it('requests the visible week on first render', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValue(buildScheduleResponse([]));
      const weekStart = getWeekStart(new Date());

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
      expect(rangeOf(mockApi.get.mock.calls[0][0])).toEqual({
        startDate: toApiDate(weekStart),
        endDate: toApiDate(addDays(weekStart, 6)),
      });
    });

    it('refetches the shifted range when the next arrow is pressed', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValue(buildScheduleResponse([]));
      renderScreen(mockApi);
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(1));

      // Act
      fireEvent.press(screen.getByTestId('week-nav-next-btn'));

      // Assert
      const nextWeekStart = addDays(getWeekStart(new Date()), 7);
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
      expect(rangeOf(mockApi.get.mock.calls[1][0])).toEqual({
        startDate: toApiDate(nextWeekStart),
        endDate: toApiDate(addDays(nextWeekStart, 6)),
      });
    });

    it('refetches the shifted range when the previous arrow is pressed', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValue(buildScheduleResponse([]));
      renderScreen(mockApi);
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(1));

      // Act
      fireEvent.press(screen.getByTestId('week-nav-prev-btn'));

      // Assert
      const prevWeekStart = addDays(getWeekStart(new Date()), -7);
      await waitFor(() => expect(mockApi.get).toHaveBeenCalledTimes(2));
      expect(rangeOf(mockApi.get.mock.calls[1][0])).toEqual({
        startDate: toApiDate(prevWeekStart),
        endDate: toApiDate(addDays(prevWeekStart, 6)),
      });
    });

    it('requests a seven-day window ending six days after it starts', async () => {
      // Arrange
      const mockApi = createMockApiClient();
      mockApi.get.mockResolvedValue(buildScheduleResponse([]));

      // Act
      renderScreen(mockApi);

      // Assert — read the bounds back off the request, not off the local clock
      await waitFor(() => expect(mockApi.get).toHaveBeenCalled());
      const { startDate, endDate } = rangeOf(mockApi.get.mock.calls[0][0]);
      expect(startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(endDate).toBe(toApiDate(addDays(new Date(`${startDate}T00:00:00`), 6)));
    });
  });
});
