import { ApiProperty } from '@nestjs/swagger';
import { ClassBookingItemDto } from './class-booking-item.dto';

/**
 * GetClassBookingsResponseDto: Response for GET /api/gyms/:gymId/classes/:classId/bookings
 *
 * Returns all booked and waitlisted athletes for a given class.
 * Accessible by the assigned coach or the gym owner.
 */
export class GetClassBookingsResponseDto {
  @ApiProperty({
    type: [ClassBookingItemDto],
    description:
      'List of athletes with active bookings (booked or waitlisted) for the class',
  })
  bookings: ClassBookingItemDto[];
}
