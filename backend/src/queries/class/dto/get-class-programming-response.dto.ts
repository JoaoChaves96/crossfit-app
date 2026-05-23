import { ApiProperty } from '@nestjs/swagger';

/**
 * GetClassProgrammingResponseDto: Response for GET /api/gyms/:gymId/classes/:classId/programming
 *
 * Returns the programming content for a given class.
 * Accessible by the assigned coach or the gym owner.
 * Returns null fields when no programming has been saved for the class.
 */
export class GetClassProgrammingResponseDto {
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Programming content (WOD description). Null if no programming exists.',
    example: '5 rounds: 10 pull-ups, 20 push-ups, 30 squats',
  })
  content: string | null;

  @ApiProperty({
    type: Boolean,
    description: 'Whether athletes are allowed to log results for this class.',
    example: true,
  })
  loggable: boolean;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description:
      'Timestamp of the last update to the programming. Null if no programming exists.',
    example: '2026-05-01T10:00:00.000Z',
  })
  lastUpdatedAt: Date | null;
}
