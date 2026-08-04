import { ApiProperty } from '@nestjs/swagger';
import { ClassScheduleItemDto } from './class-schedule-item.dto';

/**
 * GetClassScheduleResponseDto: Response for GET /api/gyms/:gymId/classes
 *
 * Returns all classes visible to the authenticated athlete,
 * filtered by membership and plan entitlement.
 */
export class GetClassScheduleResponseDto {
  @ApiProperty({
    example: 'CrossFit Downtown',
    description: 'Display name of the gym the schedule belongs to',
  })
  gymName: string;

  @ApiProperty({
    type: [ClassScheduleItemDto],
    description: 'List of classes the athlete is eligible to see and book',
  })
  classes: ClassScheduleItemDto[];
}
