import { ApiProperty } from '@nestjs/swagger';

/**
 * The state of one member's current membership plan row. Returned by every
 * owner-side membership mutation so the frontend can update in place.
 */
export class AthleteMembershipResponseDto {
  @ApiProperty({ example: 'uuid-athlete-membership-plan-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-membership-id' })
  gymMembershipId: string;

  @ApiProperty({ example: 'uuid-membership-plan-id' })
  membershipPlanId: string;

  @ApiProperty({
    type: String,
    example: 'Unlimited',
    description: 'Name of the plan, null if the plan relation is unavailable',
    nullable: true,
  })
  planName: string | null;

  @ApiProperty({ enum: ['active', 'expired'], example: 'active' })
  status: 'active' | 'expired';

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  startedAt: Date;

  @ApiProperty({
    type: Date,
    example: '2026-10-01T00:00:00.000Z',
    description: 'Null means the plan is unlimited',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({
    example: true,
    description: 'Whether the plan rolls forward automatically on expiry',
  })
  autoRoll: boolean;

  @ApiProperty({
    example: 2,
    description:
      'How many times the plan has auto-renewed since auto-renew was last switched on',
  })
  autoRollCount: number;
}
