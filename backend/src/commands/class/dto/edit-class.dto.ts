import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class EditClassDto {
  @ApiProperty({
    example: 'uuid-class-type-id',
    required: false,
    description: 'Class type to assign to the class',
  })
  @IsOptional()
  @IsString()
  classTypeId?: string;

  @ApiProperty({
    example: 'uuid-coach-user-id',
    required: false,
    description: 'Coach user ID to assign to the class',
  })
  @IsOptional()
  @IsString()
  coachUserId?: string;

  @ApiProperty({
    example: 'uuid-space-id',
    required: false,
    description: 'Space ID to assign to the class',
  })
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiProperty({
    example: '2024-06-15',
    description: 'ISO date string (YYYY-MM-DD)',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({
    example: '07:00',
    description: 'Time in HH:mm format',
    required: false,
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime must be in HH:mm format',
  })
  scheduledTime?: string;

  @ApiProperty({
    example: 20,
    minimum: 1,
    required: false,
    description: 'Maximum number of athletes that can attend the class',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'capacity must be at least 1' })
  capacity?: number;

  @ApiProperty({
    example: 60,
    minimum: 1,
    required: false,
    description: 'Duration of the class in minutes',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'duration must be at least 1' })
  duration?: number;
}
