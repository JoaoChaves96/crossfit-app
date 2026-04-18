import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @IsString()
  classTypeId: string;

  @IsString()
  coachUserId: string;

  @IsString()
  spaceId: string;

  @IsDateString()
  scheduledDate: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'scheduledTime must be in HH:mm format',
  })
  scheduledTime: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'capacity must be at least 1' })
  capacity?: number;
}
