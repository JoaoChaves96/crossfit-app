import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseMembershipPlanDto {
  @ApiProperty({ example: 'uuid-membership-plan-id' })
  @IsString()
  membershipPlanId: string;
}
