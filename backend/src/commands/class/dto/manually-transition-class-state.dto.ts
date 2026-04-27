import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManuallyTransitionClassStateDto {
  @ApiProperty({ example: 'uuid-class-id' })
  @IsUUID()
  classId: string;

  @ApiProperty({ enum: ['published', 'booking_closed', 'in_progress', 'completed', 'archived'], example: 'booking_closed' })
  @IsEnum([
    'published',
    'booking_closed',
    'in_progress',
    'completed',
    'archived',
  ])
  targetState:
    | 'published'
    | 'booking_closed'
    | 'in_progress'
    | 'completed'
    | 'archived';
}
