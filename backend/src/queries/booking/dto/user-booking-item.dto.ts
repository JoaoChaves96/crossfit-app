import { ApiProperty } from '@nestjs/swagger';

/**
 * UserBookingItemDto: A single booking for the authenticated user
 *
 * This DTO represents a booking item returned in the GET /api/me/bookings endpoint.
 * It includes only the fields needed for frontend logic to determine booking status.
 */
export class UserBookingItemDto {
  @ApiProperty({
    example: 'uuid-booking-id',
    description: 'Unique identifier for the booking',
  })
  id: string;

  @ApiProperty({
    example: 'uuid-class-id',
    description: 'The class being booked',
  })
  classId: string;

  @ApiProperty({
    enum: ['booked', 'waitlisted'],
    example: 'booked',
    description: 'Current status of the booking',
  })
  status: 'booked' | 'waitlisted';
}
