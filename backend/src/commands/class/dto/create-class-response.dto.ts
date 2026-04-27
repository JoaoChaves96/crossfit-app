import { ApiProperty } from '@nestjs/swagger';

export class CreateClassResponseDto {
  @ApiProperty({ example: 'uuid-class-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'uuid-class-type-id' })
  classTypeId: string;

  @ApiProperty({ example: 'uuid-coach-user-id' })
  coachUserId: string;

  @ApiProperty({ example: 'uuid-space-id' })
  spaceId: string;

  @ApiProperty({ example: '2024-06-15T00:00:00.000Z' })
  scheduledDate: Date;

  @ApiProperty({ example: '07:00' })
  scheduledTime: string;

  @ApiProperty({ example: 20 })
  capacity: number;

  @ApiProperty({ example: 'published', enum: ['published', 'booking_closed', 'in_progress', 'completed', 'archived'] })
  state: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  lastModifiedAt: Date;
}
