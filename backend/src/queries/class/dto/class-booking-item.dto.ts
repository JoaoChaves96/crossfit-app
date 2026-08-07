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

  @ApiProperty({
    example: 2,
    description:
      'Position in the waitlist queue, 1-based. This is the authoritative ' +
      'promotion order: the athlete with position 1 is promoted next when a ' +
      'spot frees up. Null when status is "booked" (the athlete holds a spot ' +
      'and is not queued). May also be null for a "waitlisted" athlete whose ' +
      'position has not been assigned yet, in which case they sort last.',
    nullable: true,
    type: Number,
  })
  waitlistPosition: number | null;
}
