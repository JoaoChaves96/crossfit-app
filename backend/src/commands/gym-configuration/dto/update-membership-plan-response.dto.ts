import { ApiProperty } from '@nestjs/swagger';

export class UpdateMembershipPlanResponseDto {
  @ApiProperty({ example: 'uuid-membership-plan-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'Gold Plan' })
  name: string;

  @ApiProperty({ example: 12900 })
  pricing: number;

  @ApiProperty({ enum: ['monthly', 'annual'], example: 'annual' })
  billingCycle: 'monthly' | 'annual';

  @ApiProperty({ example: ['uuid-class-type-id-1'], type: [String] })
  classTypes: string[];

  @ApiProperty({ enum: ['active', 'archived'], example: 'active' })
  status: 'active' | 'archived';

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}
