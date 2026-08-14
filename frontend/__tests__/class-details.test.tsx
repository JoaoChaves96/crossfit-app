/**
 * Tests for the athlete-facing ClassDetailsScreen (app/class-details.tsx).
 *
 * Booking state branches:
 *   - open:       class has spots and user has no booking  → "BOOK CLASS" button shown
 *   - booked:     user has a confirmed booking             → "CANCEL BOOKING" button shown, no book button
 *   - full:       class is at capacity, user not booked    → "JOIN WAITLIST" button shown
 *   - waitlisted: user is on the waitlist                  → "LEAVE WAITLIST" button shown, no book button
 *
 * Cancel flow:
 *   - booked state  → pressing cancel triggers DELETE booking endpoint
 *   - waitlisted    → pressing "leave waitlist" triggers DELETE booking endpoint
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ClassDetailsScreen from '@/app/class-details';
import { AuthContext, AuthContextType } from '@/context/AuthContext';
import { GymContext } from '@/context/GymContext';
import { createMockApiClient } from '@/test-utils/mock-api-client';
import { components } from '@/types/api.gen';

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('@/utils/api-client', () => ({
  createApiClient: jest.fn(),
}));

// Notification state lives in an app-wide provider not mounted in these tests;
// stub it so the screen's refresh-on-book call and NotificationBell work
// without a NotificationsProvider.
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

// Mock alert utils — showConfirm needs to be interceptable per-test
jest.mock('@/utils/alert', () => ({
  showConfirm: jest.fn(),
  showError: jest.fn(),
  showAlert: jest.fn(),
}));

// jsdom's window is 750px — under the 768px breakpoint — so an unpinned suite
// only ever renders the mobile register. This screen returns an entirely
// separate desktop tree (top nav + two columns), so pin the register and let the
// desktop block opt in.
let mockIsDesktop = false;
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: !mockIsDesktop, isDesktop: mockIsDesktop, width: mockIsDesktop ? 1280 : 390 }),
}));

import { createApiClient } from '@/utils/api-client';
import { showConfirm } from '@/utils/alert';

// expo-router useLocalSearchParams is globally mocked in jest-setup.ts.
// We override it per-test via jest.mocked.
import { useLocalSearchParams } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────

type GymClass = components['schemas']['ClassScheduleItemDto'];
type UserBookingItem = components['schemas']['UserBookingItemDto'];

// ─── Data factories ───────────────────────────────────────────────────────────

const CLASS_ID = 'class-abc';
const BOOKING_ID = 'booking-xyz';
const GYM_ID = 'gym-1';

function buildGymClass(overrides?: Partial<GymClass>): GymClass {
  return {
    id: CLASS_ID,
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
    id: BOOKING_ID,
    classId: CLASS_ID,
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
  user: { id: 'user-1', email: 'athlete@example.com', role: 'athlete', gymId: GYM_ID },
  token: 'test-token',
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
};

const GYM_CONTEXT = {
  currentGymId: GYM_ID,
  isLoading: false,
  setCurrentGymId: jest.fn(),
  switchGym: jest.fn(),
};

function renderScreen(mockApi = createMockApiClient()) {
  (createApiClient as jest.Mock).mockReturnValue(mockApi);
  (useLocalSearchParams as jest.Mock).mockReturnValue({ classId: CLASS_ID });

  return render(
    <AuthContext.Provider value={AUTH_CONTEXT}>
      <GymContext.Provider value={GYM_CONTEXT}>
        <ClassDetailsScreen />
      </GymContext.Provider>
    </AuthContext.Provider>
  );
}

/**
 * Builds a mock API client pre-configured for a given booking state.
 * The `afterCancelBookings` parameter sets what the bookings endpoint
 * returns on the second call (after a DELETE), used to verify state refresh.
 */
function buildApiForState(
  state: 'open' | 'booked' | 'full' | 'waitlisted',
  afterCancelBookings?: UserBookingItem[]
) {
  const mockApi = createMockApiClient();

  const cls = buildGymClass({
    bookedCount: state === 'full' || state === 'waitlisted' ? 20 : 10,
    capacity: 20,
  });

  const initialBookings: UserBookingItem[] = [];
  if (state === 'booked') {
    initialBookings.push(buildUserBooking({ status: 'booked', waitlistPosition: null }));
  } else if (state === 'waitlisted') {
    initialBookings.push(buildUserBooking({ status: 'waitlisted', waitlistPosition: 2 }));
  }

  mockApi.get.mockImplementation((url: string) => {
    if (url.includes('/classes')) return Promise.resolve(buildScheduleResponse([cls]));
    if (url.includes('/bookings')) {
      if (afterCancelBookings && mockApi.delete.mock.calls.length > 0) {
        return Promise.resolve(buildBookingsResponse(afterCancelBookings));
      }
      return Promise.resolve(buildBookingsResponse(initialBookings));
    }
    return Promise.reject(new Error(`Unexpected GET: ${url}`));
  });

  mockApi.delete.mockResolvedValue({});
  mockApi.post.mockResolvedValue({});

  return mockApi;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

// Top-level, so each describe starts in the mobile register regardless of what
// an earlier block pinned.
beforeEach(() => {
  mockIsDesktop = false;
});

describe('ClassDetailsScreen — booking action buttons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Open state ─────────────────────────────────────────────────────────────

  describe('when class is available and athlete has no booking', () => {
    it('shows the "BOOK CLASS" button', async () => {
      // Arrange
      const mockApi = buildApiForState('open');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('BOOK CLASS')).toBeTruthy();
      });
    });

    it('does not show a cancel or leave waitlist button', async () => {
      // Arrange
      const mockApi = buildApiForState('open');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => expect(screen.getByText('BOOK CLASS')).toBeTruthy());
      expect(screen.queryByText('CANCEL BOOKING')).toBeNull();
      expect(screen.queryByText('LEAVE WAITLIST')).toBeNull();
    });
  });

  // ── Booked state ───────────────────────────────────────────────────────────

  describe('when athlete has a confirmed booking', () => {
    it('shows the "CANCEL BOOKING" button', async () => {
      // Arrange
      const mockApi = buildApiForState('booked');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('CANCEL BOOKING')).toBeTruthy();
      });
    });

    it('shows the "BOOKED – Confirmed" status badge', async () => {
      // Arrange
      const mockApi = buildApiForState('booked');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('BOOKED – Confirmed')).toBeTruthy();
      });
    });

    it('does not show the "BOOK CLASS" button', async () => {
      // Arrange
      const mockApi = buildApiForState('booked');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => expect(screen.getByText('CANCEL BOOKING')).toBeTruthy());
      expect(screen.queryByText('BOOK CLASS')).toBeNull();
    });
  });

  // ── Full state (not on waitlist) ───────────────────────────────────────────

  describe('when class is full and athlete is not on the waitlist', () => {
    it('shows the "JOIN WAITLIST" button', async () => {
      // Arrange
      const mockApi = buildApiForState('full');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('JOIN WAITLIST')).toBeTruthy();
      });
    });

    it('does not show a cancel or leave waitlist button', async () => {
      // Arrange
      const mockApi = buildApiForState('full');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => expect(screen.getByText('JOIN WAITLIST')).toBeTruthy());
      expect(screen.queryByText('CANCEL BOOKING')).toBeNull();
      expect(screen.queryByText('LEAVE WAITLIST')).toBeNull();
    });
  });

  // ── Waitlisted state ───────────────────────────────────────────────────────

  describe('when athlete is on the waitlist', () => {
    it('shows the "LEAVE WAITLIST" button', async () => {
      // Arrange
      const mockApi = buildApiForState('waitlisted');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('LEAVE WAITLIST')).toBeTruthy();
      });
    });

    it('shows the waitlist position in the status badge', async () => {
      // Arrange
      const mockApi = buildApiForState('waitlisted');

      // Act
      renderScreen(mockApi);

      // Assert — waitlistPosition=2 → badge contains "#2"
      await waitFor(() => {
        expect(screen.getByText(/WAITLIST #2/)).toBeTruthy();
      });
    });

    it('does not show the "BOOK CLASS" button', async () => {
      // Arrange
      const mockApi = buildApiForState('waitlisted');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => expect(screen.getByText('LEAVE WAITLIST')).toBeTruthy());
      expect(screen.queryByText('BOOK CLASS')).toBeNull();
    });

    it('does not show the "CANCEL BOOKING" button', async () => {
      // Arrange
      const mockApi = buildApiForState('waitlisted');

      // Act
      renderScreen(mockApi);

      // Assert
      await waitFor(() => expect(screen.getByText('LEAVE WAITLIST')).toBeTruthy());
      expect(screen.queryByText('CANCEL BOOKING')).toBeNull();
    });
  });
});

// ─── Cancel flow ───────────────────────────────────────────────────────────────

describe('ClassDetailsScreen — cancel actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when athlete cancels a confirmed booking', () => {
    it('calls the DELETE booking endpoint with the correct booking id', async () => {
      // Arrange
      const mockApi = buildApiForState('booked');

      // Intercept showConfirm to immediately invoke the destructive button handler
      (showConfirm as jest.Mock).mockImplementationOnce(
        (_title: string, _message: string, buttons: Array<{ style?: string; onPress: () => void | Promise<void> }>) => {
          const destructive = buttons.find((b) => b.style === 'destructive');
          destructive?.onPress();
        }
      );

      renderScreen(mockApi);
      await waitFor(() => expect(screen.getByText('CANCEL BOOKING')).toBeTruthy());

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText('CANCEL BOOKING'));
      });

      // Assert
      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith(
          `/api/gyms/${GYM_ID}/classes/bookings/${BOOKING_ID}`
        );
      });
    });

    it('shows the confirmation dialog before deleting', async () => {
      // Arrange
      const mockApi = buildApiForState('booked');
      renderScreen(mockApi);
      await waitFor(() => expect(screen.getByText('CANCEL BOOKING')).toBeTruthy());

      // Act
      fireEvent.press(screen.getByText('CANCEL BOOKING'));

      // Assert — showConfirm was called before any delete occurs
      expect(showConfirm).toHaveBeenCalled();
      expect(mockApi.delete).not.toHaveBeenCalled();
    });
  });

  describe('when athlete leaves the waitlist', () => {
    it('calls the DELETE booking endpoint with the correct booking id', async () => {
      // Arrange
      const mockApi = buildApiForState('waitlisted');

      (showConfirm as jest.Mock).mockImplementationOnce(
        (_title: string, _message: string, buttons: Array<{ style?: string; onPress: () => void | Promise<void> }>) => {
          const destructive = buttons.find((b) => b.style === 'destructive');
          destructive?.onPress();
        }
      );

      renderScreen(mockApi);
      await waitFor(() => expect(screen.getByText('LEAVE WAITLIST')).toBeTruthy());

      // Act
      await act(async () => {
        fireEvent.press(screen.getByText('LEAVE WAITLIST'));
      });

      // Assert
      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith(
          `/api/gyms/${GYM_ID}/classes/bookings/${BOOKING_ID}`
        );
      });
    });

    it('shows a confirmation dialog before removing the waitlist entry', async () => {
      // Arrange
      const mockApi = buildApiForState('waitlisted');
      renderScreen(mockApi);
      await waitFor(() => expect(screen.getByText('LEAVE WAITLIST')).toBeTruthy());

      // Act
      fireEvent.press(screen.getByText('LEAVE WAITLIST'));

      // Assert
      expect(showConfirm).toHaveBeenCalled();
      expect(mockApi.delete).not.toHaveBeenCalled();
    });

    it('uses the same DELETE endpoint as cancel booking (not a separate leave-waitlist endpoint)', async () => {
      // Arrange
      const mockApi = buildApiForState('waitlisted');

      (showConfirm as jest.Mock).mockImplementationOnce(
        (_title: string, _message: string, buttons: Array<{ style?: string; onPress: () => void | Promise<void> }>) => {
          const destructive = buttons.find((b) => b.style === 'destructive');
          destructive?.onPress();
        }
      );

      renderScreen(mockApi);
      await waitFor(() => expect(screen.getByText('LEAVE WAITLIST')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByText('LEAVE WAITLIST'));
      });

      // Assert — endpoint is the bookings DELETE, not a waitlist-specific route
      await waitFor(() => {
        expect(mockApi.delete).toHaveBeenCalledWith(
          expect.stringContaining('/bookings/')
        );
      });
    });
  });
});

// ─── Desktop register ─────────────────────────────────────────────────────────

// The desktop register is a separate early return: a DesktopTopNav over a
// two-column split, where the left column carries class info + booking and the
// right column carries programming + results. Mobile stacks everything in one
// scroll behind its own header. None of this had coverage.
describe('ClassDetailsScreen — desktop register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDesktop = true;
  });

  it('renders the desktop back affordance instead of the mobile header', async () => {
    // Arrange
    const mockApi = buildApiForState('open');

    // Act
    renderScreen(mockApi);

    // Assert — desktop labels its back control; mobile uses a bare icon under a
    // "Class Details" title, so the two registers are distinguishable.
    await waitFor(() => {
      expect(screen.getByText('Back to Schedule')).toBeTruthy();
    });
    expect(screen.queryByText('Class Details')).toBeNull();
  });

  it('renders both columns: class info alongside programming and results', async () => {
    // Arrange
    const mockApi = buildApiForState('open');

    // Act
    renderScreen(mockApi);

    // Assert — left column content and right column content are both present in
    // the same tree, which is the whole point of the desktop split
    await waitFor(() => {
      expect(screen.getByText('CrossFit')).toBeTruthy();
    });
    expect(screen.getByText('Programming')).toBeTruthy();
    expect(screen.getByText('Recent Results')).toBeTruthy();
    // Secondary content resolves to its placeholder rather than staying blank
    expect(screen.getByText('No programming has been posted for this class yet.')).toBeTruthy();
    // Source writes this with &apos;, which renders as a straight quote.
    expect(screen.getByText("You haven't logged a result for this class.")).toBeTruthy();
  });

  it('keeps the booking action available in the desktop layout', async () => {
    // Arrange — the action buttons are shared between registers but sit in a
    // different container; prove the desktop path still renders and wires them.
    const mockApi = buildApiForState('open');

    // Act
    renderScreen(mockApi);
    await waitFor(() => {
      expect(screen.getByTestId('book-btn')).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('book-btn'));
    });

    // Assert
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        expect.stringContaining('/bookings'),
        expect.anything()
      );
    });
  });

  it('shows the cancel action for a booked class in the desktop layout', async () => {
    // Arrange
    const mockApi = buildApiForState('booked');

    // Act
    renderScreen(mockApi);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId('cancel-booking-btn')).toBeTruthy();
    });
    expect(screen.queryByTestId('book-btn')).toBeNull();
  });
});
