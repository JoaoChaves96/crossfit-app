import { ApiProperty } from '@nestjs/swagger';

/**
 * ClassBookingItemDto: A single booked athlete for a class
 *
 * Returned to coaches and gym owners viewing the attendance/booking list
 * for a class (Mark Attendance screen).
 */
export class ClassBookingItemDto {
  @ApiProperty({
    example: 'uuid-booking-id',
    description: 'Unique identifier for the booking',
  })
  bookingId: string;

  @ApiProperty({
    example: 'uuid-athlete-user-id',
    description: 'User ID of the booked athlete',
  })
  athleteUserId: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Display name of the athlete (full name or username)',
  })
  displayName: string;

  @ApiProperty({
    enum: ['booked', 'waitlisted'],
    example: 'booked',
    description: 'Current status of the booking',
  })
  status: 'booked' | 'waitlisted';
}
