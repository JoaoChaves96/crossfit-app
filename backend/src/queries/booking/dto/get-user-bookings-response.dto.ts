import { ApiProperty } from '@nestjs/swagger';
import { UserBookingItemDto } from './user-booking-item.dto';

/**
 * GetUserBookingsResponseDto: Response for GET /api/me/bookings
 *
 * Returns all active bookings (booked or waitlisted) for the authenticated user,
 * across all gyms.
 */
export class GetUserBookingsResponseDto {
  @ApiProperty({
    type: [UserBookingItemDto],
    description: "List of the user's active bookings",
  })
  bookings: UserBookingItemDto[];
}
