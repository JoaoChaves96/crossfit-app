/**
 * Tests for the athlete-facing Schedule screen ((tabs)/schedule.tsx).
 *
 * This screen fetches the gym class schedule and the user's bookings, then
 * derives a per-card booking status (open / booked / waitlisted / full) and
 * renders the appropriate badge and action button on each ClassCard.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ScheduleScreen from '@/app/(tabs)/schedule';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { createMockApiClient } from '@/test-utils/mock-api-client';
import { components } from '@/types/api.gen';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

jest.mock('@/utils/alert', () => ({
  showConfirm: jest.fn(),
  showError: jest.fn(),
  showAlert: jest.fn(),
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
