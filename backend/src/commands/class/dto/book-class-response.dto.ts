import { ApiProperty } from '@nestjs/swagger';

export class BookClassResponseDto {
  @ApiProperty({ example: 'uuid-booking-id' })
  id: string;

  @ApiProperty({ example: 'uuid-class-id' })
  classId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({ enum: ['booked', 'waitlisted', 'cancelled'], example: 'booked' })
  status: 'booked' | 'waitlisted' | 'cancelled';

  @ApiProperty({ example: 1, nullable: true })
  bookedPosition: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: null, nullable: true })
  cancelledAt: Date | null;
}
