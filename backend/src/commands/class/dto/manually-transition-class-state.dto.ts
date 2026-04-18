import { IsUUID, IsEnum } from 'class-validator';

export class ManuallyTransitionClassStateDto {
  @IsUUID()
  classId: string;

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
