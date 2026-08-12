import { ApiProperty } from '@nestjs/swagger';
import { MembershipPlanItemDto } from './membership-plan-item.dto';

export class GetMembershipPlansResponseDto {
  @ApiProperty({
    type: [MembershipPlanItemDto],
    description: 'Membership plans for the gym, newest first',
  })
  plans: MembershipPlanItemDto[];
}
