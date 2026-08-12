import { ApiProperty } from '@nestjs/swagger';

export class MembershipPlanItemDto {
  @ApiProperty({
    example: 'uuid-plan-id',
    description: 'Unique identifier for the membership plan',
  })
  id: string;

  @ApiProperty({
    example: 'Unlimited',
    description: 'Name of the membership plan',
  })
  name: string;

  @ApiProperty({
    example: 12000,
    description: 'Price of the plan in minor currency units (cents)',
  })
  pricing: number;

  @ApiProperty({
    enum: ['monthly', 'annual'],
    example: 'monthly',
    description: 'How often the plan renews',
  })
  billingCycle: 'monthly' | 'annual';

  @ApiProperty({
    type: [String],
    example: ['uuid-class-type-1', 'uuid-class-type-2'],
    description: 'IDs of the class types this plan grants access to',
  })
  classTypes: string[];

  @ApiProperty({
    enum: ['active', 'archived'],
    example: 'active',
    description:
      'Archived plans stay attached to existing subscribers but cannot be newly assigned',
  })
  status: 'active' | 'archived';

  @ApiProperty({
    example: 14,
    description: 'Number of members currently subscribed to this plan',
  })
  subscriberCount: number;
}
