import { ApiProperty } from '@nestjs/swagger';

/**
 * ClassScheduleItemDto: A single class in the athlete's schedule
 *
 * This DTO represents class data as presented to an athlete
 * in the "Class Schedule" screen. It includes only the fields
 * needed for rendering the schedule view.
 */
export class ClassScheduleItemDto {
  @ApiProperty({
    example: 'uuid-class-id',
    description: 'Unique identifier for the class',
  })
  id: string;

  @ApiProperty({
    example: 'uuid-class-type-id',
    description: 'The type of class (e.g., CrossFit, Gymnastics)',
  })
  classTypeId: string;

  @ApiProperty({
    example: 'CrossFit',
    description: 'Human-readable name of the class type',
  })
  classTypeName: string;

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
    example: 'uuid-coach-user-id',
    description: 'User ID of the coach leading the class',
  })
  coachUserId: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name of the coach leading the class',
  })
  coachName: string;

  @ApiProperty({ example: 20, description: 'Total capacity of the class' })
  capacity: number;

  @ApiProperty({
    example: 60,
    description: 'Duration of the class in minutes',
  })
  duration: number;

  @ApiProperty({
    example: 12,
    description: 'Number of booked (confirmed) spots',
  })
  bookedCount: number;

  @ApiProperty({
    example: 'uuid-space-id',
    description: 'ID of the space where the class takes place',
  })
  spaceId: string;

  @ApiProperty({
    example: 'Main Floor',
    description: 'Name of the space where the class takes place',
  })
  spaceName: string;

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
