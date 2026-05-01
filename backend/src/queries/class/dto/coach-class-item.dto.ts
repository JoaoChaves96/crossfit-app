import { ApiProperty } from '@nestjs/swagger';

export class CoachClassItemDto {
  @ApiProperty({
    example: 'uuid-class-id',
    description: 'Unique identifier for the class',
  })
  id: string;

  @ApiProperty({
    example: '2024-06-15',
    description: 'Date the class is scheduled, YYYY-MM-DD format',
  })
  scheduledDate: string;

  @ApiProperty({
    example: '07:00',
    description: 'Time the class starts, HH:mm format',
  })
  scheduledTime: string;

  @ApiProperty({
    example: 'Main Box',
    description: 'Name of the space where the class takes place',
  })
  spaceName: string;

  @ApiProperty({
    example: 'CrossFit',
    description: 'Human-readable name of the class type',
  })
  classTypeName: string;

  @ApiProperty({ example: 20, description: 'Total capacity of the class' })
  capacity: number;

  @ApiProperty({
    example: 12,
    description: 'Number of booked (confirmed) spots',
  })
  bookedCount: number;

  @ApiProperty({
    enum: [
      'published',
      'booking_closed',
      'in_progress',
      'completed',
      'archived',
    ],
    example: 'published',
    description: 'Current state of the class in its lifecycle',
  })
  state:
    | 'published'
    | 'booking_closed'
    | 'in_progress'
    | 'completed'
    | 'archived';
}
