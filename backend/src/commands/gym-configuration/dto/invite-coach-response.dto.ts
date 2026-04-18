export class InviteCoachResponseDto {
  id: string;
  gymId: string;
  userId: string;
  role: 'owner' | 'coach';
  status: 'active' | 'inactive';
  assignedAt: Date;
}
