import { ApiProperty } from '@nestjs/swagger';

export class ManuallyAddMemberResponseDto {
  @ApiProperty({ example: 'uuid-gym-membership-id' })
  gymMembershipId: string;

  @ApiProperty({ example: 'uuid-athlete-user-id' })
  userId: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ enum: ['active', 'inactive'], example: 'active' })
  status: 'active' | 'inactive';

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  joinedAt: Date;

  @ApiProperty({ example: 'uuid-athlete-membership-plan-id', required: false })
  athleteMembershipPlanId?: string;
}
