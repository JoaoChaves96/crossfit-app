import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, Matches } from 'class-validator';

/**
 * Query parameters for GET /api/gyms/:gymId/schedule.
 *
 * This MUST stay a real class. An inline type literal on `@Query()` gives
 * ValidationPipe no metatype to work with, so it validates nothing and every
 * value is accepted — the same gap that let an arbitrary `status` string be
 * persisted on the coach PATCH endpoint.
 *
 * Both bounds are optional and independent: omitting them returns the gym's
 * whole schedule, which is what every existing caller gets today.
 */
const CALENDAR_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The regex pins the SHAPE; IsDateString(strict) pins that the day actually
 * exists. Both are needed:
 *
 * - without the regex, a full ISO instant like '2026-08-10T00:00:00Z' would pass
 *   and then be compared against a `date` column as a string
 * - without the strict date check, '2026-99-99' would pass the shape and reach
 *   Postgres, where casting it to `date` raises and turns a bad request into a 500
 */

export class GetGymScheduleQueryDto {
  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-08-10',
    description:
      'Only return classes scheduled on or after this calendar day (inclusive, YYYY-MM-DD). Omit for no lower bound.',
  })
  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DAY, {
    message: 'startDate must be a calendar day in YYYY-MM-DD format',
  })
  @IsDateString(
    { strict: true },
    { message: 'startDate must be an existing calendar day' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    example: '2026-08-16',
    description:
      'Only return classes scheduled on or before this calendar day (inclusive, YYYY-MM-DD). Omit for no upper bound.',
  })
  @IsOptional()
  @IsString()
  @Matches(CALENDAR_DAY, {
    message: 'endDate must be a calendar day in YYYY-MM-DD format',
  })
  @IsDateString(
    { strict: true },
    { message: 'endDate must be an existing calendar day' },
  )
  endDate?: string;
}
