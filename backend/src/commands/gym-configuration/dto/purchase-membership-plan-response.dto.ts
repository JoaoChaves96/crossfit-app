import { ApiProperty } from '@nestjs/swagger';

export class PurchaseMembershipPlanResponseDto {
  @ApiProperty({ example: 'uuid-athlete-membership-plan-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-membership-id' })
  gymMembershipId: string;

  @ApiProperty({ example: 'uuid-membership-plan-id' })
  membershipPlanId: string;

  @ApiProperty({ enum: ['active', 'expired'], example: 'active' })
  status: 'active' | 'expired';

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  startedAt: Date;

  @ApiProperty({
    type: Date,
    example: '2025-01-01T00:00:00.000Z',
    nullable: true,
  })
  expiresAt: Date | null;
}
