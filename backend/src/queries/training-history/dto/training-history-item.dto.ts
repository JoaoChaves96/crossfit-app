import { ApiProperty } from '@nestjs/swagger';

/**
 * TrainingHistoryResultDto: Logged result for a past class
 *
 * Null when no result was logged for the class.
 */
export class TrainingHistoryResultDto {
  @ApiProperty({
    example: 'uuid-result-id',
    description: 'Unique identifier for the result',
  })
  id: string;

  @ApiProperty({
    enum: ['time', 'reps', 'weight', 'rounds', 'note'],
    example: 'weight',
    description: 'Type of metric used for the result',
  })
  metricType: 'time' | 'reps' | 'weight' | 'rounds' | 'note';

  @ApiProperty({
    example: '100',
    description: 'The recorded value for the result',
  })
  value: string;

  @ApiProperty({
    enum: ['seconds', 'minutes', 'reps', 'kg', 'lb', 'rounds', 'none'],
    example: 'kg',
    description: 'Unit of measurement for the result value',
  })
  unit: 'seconds' | 'minutes' | 'reps' | 'kg' | 'lb' | 'rounds' | 'none';

  @ApiProperty({
    example: 'Felt strong today',
    description: 'Optional notes attached to the result',
    nullable: true,
    type: String,
  })
  notes: string | null;

  @ApiProperty({
    example: '2024-06-01T10:30:00.000Z',
    description: 'Timestamp when the result was first logged',
  })
  loggedAt: Date;

  @ApiProperty({
    example: '2024-06-01T11:00:00.000Z',
    description: 'Timestamp when the result was last edited, if ever',
    nullable: true,
    type: Date,
  })
  editedAt: Date | null;
}

/**
 * TrainingHistoryItemDto: A single past class entry in the athlete's training history
 */
export class TrainingHistoryItemDto {
  @ApiProperty({
    example: 'uuid-class-id',
    description: 'Unique identifier for the class',
  })
  classId: string;

  @ApiProperty({
    example: 'CrossFit WOD',
    description: 'Name of the class type',
  })
  className: string;

  @ApiProperty({
    example: 'Maria Santos',
    description: 'Full name of the coach who led the class',
  })
  coachName: string;

  @ApiProperty({
    example: '2024-06-01T09:00:00.000Z',
    description: 'ISO 8601 datetime combining the scheduled date and time',
  })
  scheduledAt: string;

  @ApiProperty({
    enum: ['completed', 'archived'],
    example: 'completed',
    description: 'Current lifecycle state of the class',
  })
  classState: 'completed' | 'archived';

  @ApiProperty({
    type: TrainingHistoryResultDto,
    nullable: true,
    description: 'The logged result for this class, or null if none was logged',
  })
  result: TrainingHistoryResultDto | null;
}
