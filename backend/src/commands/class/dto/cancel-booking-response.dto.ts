import { ApiProperty } from '@nestjs/swagger';

export class CancelBookingResponseDto {
  @ApiProperty({ example: 'uuid-booking-id' })
  id: string;

  @ApiProperty({ example: 'uuid-class-id' })
  classId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ enum: ['booked', 'waitlisted', 'cancelled'], example: 'cancelled' })
  status: 'booked' | 'waitlisted' | 'cancelled';

  @ApiProperty({ example: null, nullable: true })
  bookedPosition: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-06-15T10:00:00.000Z', nullable: true })
  cancelledAt: Date | null;
}
