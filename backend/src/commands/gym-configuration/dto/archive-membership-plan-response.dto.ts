export class ArchiveMembershipPlanResponseDto {
  id: string;
  gymId: string;
  name: string;
  pricing: number;
  billingCycle: 'monthly' | 'annual';
  classTypes: string[];
  status: 'active' | 'archived';
  createdAt: Date;
}
