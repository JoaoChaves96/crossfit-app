/**
 * Tests for BookingsPanel (app/class-management/BookingsPanel.tsx).
 *
 * The waitlist position column is the subject here. `waitlistPosition` comes from
 * the API and is the authoritative promotion order — position 1 is promoted next.
 * Two things must never regress:
 *
 *   - the rendered number is the API value, NOT the array index. A list whose
 *     positions are 2,3,5 must render 2,3,5 — renumbering it 1,2,3 would tell the
 *     owner a promotion order the backend will not follow.
 *   - a null position (backend has not assigned one) renders a neutral dash, not
 *     a fabricated number.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { BookingsPanel } from '@/app/class-management/BookingsPanel';
import { components } from '@/types/api.gen';

type ClassBookingItem = components['schemas']['ClassBookingItemDto'];

// Layout mode is irrelevant to the position rendering; pin it so the test does
// not depend on the ambient window dimensions.
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}));

/** The text rendered in the position column for a given booking id. */
function positionText(bookingId: string): string {
  return screen.getByTestId(`waitlist-position-${bookingId}`).props.children;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function makeBooked(overrides: Partial<ClassBookingItem> = {}): ClassBookingItem {
  return {
    bookingId: 'booking-booked-1',
    athleteUserId: 'user-1',
    displayName: 'Ana Silva',
    status: 'booked',
    waitlistPosition: null,
    ...overrides,
  };
}

function makeWaitlisted(overrides: Partial<ClassBookingItem> = {}): ClassBookingItem {
  return {
    bookingId: 'booking-wait-1',
    athleteUserId: 'user-2',
    displayName: 'Bruno Costa',
    status: 'waitlisted',
    waitlistPosition: 1,
    ...overrides,
  };
}

describe('BookingsPanel — waitlist position column', () => {
  it('renders the position value supplied by the API', () => {
    // Arrange
    const waitlisted = [makeWaitlisted({ bookingId: 'w1', waitlistPosition: 1 })];

    // Act
    render(<BookingsPanel bookedList={[]} waitlistedList={waitlisted} />);

    // Assert
    expect(positionText('w1')).toBe('1');
  });

  it('renders API positions verbatim rather than renumbering by array index', () => {
    // Arrange — a queue whose positions are NOT 1,2,3. This happens after
    // promotions re-sequence the waitlist; the owner must see the real order.
    const waitlisted = [
      makeWaitlisted({ bookingId: 'w1', displayName: 'Ana Silva', waitlistPosition: 2 }),
      makeWaitlisted({ bookingId: 'w2', displayName: 'Bruno Costa', waitlistPosition: 3 }),
      makeWaitlisted({ bookingId: 'w3', displayName: 'Carla Dias', waitlistPosition: 5 }),
    ];

    // Act
    render(<BookingsPanel bookedList={[]} waitlistedList={waitlisted} />);

    // Assert — the API values, not 1,2,3
    expect(positionText('w1')).toBe('2');
    expect(positionText('w2')).toBe('3');
    expect(positionText('w3')).toBe('5');
  });

  it('renders a neutral dash when the position is unassigned', () => {
    // Arrange
    const waitlisted = [makeWaitlisted({ bookingId: 'w1', waitlistPosition: null })];

    // Act
    render(<BookingsPanel bookedList={[]} waitlistedList={waitlisted} />);

    // Assert — a dash, never a fabricated number
    expect(positionText('w1')).toBe('—');
  });

  it('preserves the order the API returned', () => {
    // Arrange
    const waitlisted = [
      makeWaitlisted({ bookingId: 'w1', displayName: 'Ana Silva', waitlistPosition: 1 }),
      makeWaitlisted({ bookingId: 'w2', displayName: 'Bruno Costa', waitlistPosition: 2 }),
    ];

    // Act
    render(<BookingsPanel bookedList={[]} waitlistedList={waitlisted} />);

    // Assert
    const names = screen.getAllByText(/Ana Silva|Bruno Costa/).map((n) => n.props.children);
    expect(names).toEqual(['Ana Silva', 'Bruno Costa']);
  });
});

describe('BookingsPanel — sections', () => {
  it('shows booked athletes in the attendance list with a confirmed chip', () => {
    // Arrange
    const booked = [makeBooked({ displayName: 'Ana Silva' })];

    // Act
    render(<BookingsPanel bookedList={booked} waitlistedList={[]} />);

    // Assert
    expect(screen.getByText('Ana Silva')).toBeTruthy();
    expect(screen.getByText('Confirmed')).toBeTruthy();
    expect(screen.getByText('1 booked')).toBeTruthy();
  });

  it('shows both empty states when the class has no bookings', () => {
    // Act
    render(<BookingsPanel bookedList={[]} waitlistedList={[]} />);

    // Assert
    expect(screen.getByText('No booked athletes')).toBeTruthy();
    expect(screen.getByText('No one on waitlist')).toBeTruthy();
  });

  it('counts the waitlist in its header chip', () => {
    // Arrange
    const waitlisted = [
      makeWaitlisted({ bookingId: 'w1', waitlistPosition: 1 }),
      makeWaitlisted({ bookingId: 'w2', waitlistPosition: 2 }),
    ];

    // Act
    render(<BookingsPanel bookedList={[]} waitlistedList={waitlisted} />);

    // Assert
    expect(screen.getByText('2 waiting')).toBeTruthy();
  });
});
