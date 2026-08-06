import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsArray,
  ArrayNotEmpty,
  ArrayUnique,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecurringClassesDto {
  @ApiProperty({ example: 'uuid-class-type-id' })
  @IsString()
  classTypeId: string;

  @ApiProperty({ example: 'uuid-coach-user-id' })
  @IsString()
  coachUserId: string;

  @ApiProperty({ example: 'uuid-space-id' })
  @IsString()
  spaceId: string;

  @ApiProperty({
    example: [1, 3, 5],
    description: 'Days of week. 0=Sunday … 6=Saturday. At least one, unique.',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays: number[];

  @ApiProperty({ example: '08:00', description: 'Time in HH:mm format' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime must be in HH:mm format',
  })
  scheduledTime: string;

  @ApiProperty({ example: '2026-08-03', description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-12-31', description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 20, minimum: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'capacity must be at least 1' })
  capacity?: number;

  @ApiProperty({ example: 60, minimum: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'duration must be at least 1' })
  duration?: number;
}
