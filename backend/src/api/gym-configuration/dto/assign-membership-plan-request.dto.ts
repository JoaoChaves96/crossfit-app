import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignMembershipPlanRequestDto {
  @ApiProperty({
    example: 'uuid-membership-plan-id',
    description:
      'ID of the plan to put the member on. Must be an active plan belonging to this gym.',
  })
  @IsUUID()
  membershipPlanId: string;
}
