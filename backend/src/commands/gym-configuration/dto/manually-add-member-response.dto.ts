export class ManuallyAddMemberResponseDto {
  gymMembershipId: string;
  userId: string;
  gymId: string;
  status: 'active' | 'inactive';
  joinedAt: Date;
  athleteMembershipPlanId?: string;
}
