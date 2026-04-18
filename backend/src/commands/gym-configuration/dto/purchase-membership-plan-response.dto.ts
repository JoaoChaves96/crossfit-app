export class PurchaseMembershipPlanResponseDto {
  id: string;
  gymMembershipId: string;
  membershipPlanId: string;
  status: 'active' | 'expired';
  startedAt: Date;
  expiresAt: Date | null;
}
