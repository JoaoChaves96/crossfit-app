/**
 * UserBookingItemDto: A single booking for the authenticated user
 *
 * This DTO represents a booking item returned in the GET /api/me/bookings endpoint.
 * It includes only the fields needed for frontend logic to determine booking status.
 */
export class UserBookingItemDto {
  /** Unique identifier for the booking */
  id: string;

  /** The class being booked */
  classId: string;

  /** Current status of the booking */
  status: 'booked' | 'waitlisted';
}
