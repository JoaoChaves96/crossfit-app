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

export class CreateClassDto {
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
    example: '2024-06-15',
    description: 'ISO date string (YYYY-MM-DD)',
  })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({ example: '07:00', description: 'Time in HH:mm format' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime must be in HH:mm format',
  })
  scheduledTime: string;

  @ApiProperty({ example: 20, minimum: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'capacity must be at least 1' })
  capacity?: number;
}
