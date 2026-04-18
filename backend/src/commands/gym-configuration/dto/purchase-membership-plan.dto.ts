import { IsString } from 'class-validator';

export class PurchaseMembershipPlanDto {
  @IsString()
  membershipPlanId: string;
}
