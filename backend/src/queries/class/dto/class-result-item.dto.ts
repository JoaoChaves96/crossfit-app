import { ApiProperty } from '@nestjs/swagger';

/**
 * ClassResultItemDto: A single athlete result for a class
 *
 * Returned to coaches and gym owners viewing results for a completed class.
 */
export class ClassResultItemDto {
  @ApiProperty({
    example: 'uuid-result-id',
    description: 'Unique identifier for the result',
  })
  id: string;

  @ApiProperty({
    example: 'uuid-user-id',
    description: 'ID of the athlete who logged this result',
  })
  userId: string;

  @ApiProperty({
    enum: ['time', 'reps', 'weight', 'rounds', 'note'],
    example: 'time',
    description: 'Type of metric logged',
  })
  metricType: 'time' | 'reps' | 'weight' | 'rounds' | 'note';

  @ApiProperty({ example: '180', description: 'Result value (as string)' })
  value: string;

  @ApiProperty({
    enum: ['seconds', 'minutes', 'reps', 'kg', 'lb', 'rounds', 'none'],
    example: 'seconds',
    description: 'Unit for the result value',
  })
  unit: 'seconds' | 'minutes' | 'reps' | 'kg' | 'lb' | 'rounds' | 'none';

  @ApiProperty({
    example: 'Felt strong today',
    description: 'Optional notes from the athlete',
    nullable: true,
  })
  notes: string | null;

  @ApiProperty({
    example: '2024-06-15T09:00:00.000Z',
    description: 'Timestamp when the result was logged',
  })
  loggedAt: Date;

  @ApiProperty({
    example: '2024-06-15T09:05:00.000Z',
    description:
      'Timestamp when the result was last edited, or null if never edited',
    nullable: true,
  })
  editedAt: Date | null;
}
