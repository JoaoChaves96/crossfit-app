import { Injectable } from '@nestjs/common';
import { BookingRepository } from '../../repositories/booking.repository';
import { UserBookingItemDto } from './dto/user-booking-item.dto';
import { GetUserBookingsResponseDto } from './dto/get-user-bookings-response.dto';

/**
 * UserBookingsService: Query handler for authenticated user's bookings
 *
 * Provides a read-only view of the user's active bookings (booked or waitlisted).
 * Implicitly enforces tenant isolation since bookings are inherently user-scoped.
 *
 * This service:
 * - Fetches only the authenticated user's bookings
 * - Filters out cancelled bookings
 * - Returns minimal booking data (id, classId, status)
 * - Is read-only with no side effects
 */
@Injectable()
export class UserBookingsService {
  constructor(private readonly bookingRepository: BookingRepository) {}

  /**
   * Get all active bookings for the authenticated user
   *
   * @param userId - The authenticated user ID
   * @returns All active bookings (booked or waitlisted) for the user
   */
  async getUserBookings(userId: string): Promise<GetUserBookingsResponseDto> {
    const bookingEntities =
      await this.bookingRepository.getActiveBookingsByUser(userId);

    const bookings: UserBookingItemDto[] = bookingEntities.map((booking) => ({
      id: booking.id,
      classId: booking.classId,
      status: booking.status as 'booked' | 'waitlisted',
    }));

    return {
      bookings,
    };
  }
}
