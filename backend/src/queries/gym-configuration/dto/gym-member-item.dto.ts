import { ApiProperty } from '@nestjs/swagger';

export class GymMemberItemDto {
  @ApiProperty({
    example: 'uuid-membership-id',
    description: 'Unique identifier for the gym membership record',
  })
  id: string;

  @ApiProperty({
    example: 'uuid-user-id',
    description: 'User ID of the member',
  })
  userId: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Full name of the member',
  })
  name: string;

  @ApiProperty({
    example: 'jane@example.com',
    description: 'Email address of the member',
  })
  email: string;

  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'active',
    description: 'Current membership status',
  })
  status: 'active' | 'inactive';

  @ApiProperty({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Date and time the member joined the gym',
  })
  joinedAt: Date;

  @ApiProperty({
    type: String,
    example: 'uuid-plan-id',
    description: 'ID of the plan the member is currently on, null if none',
    nullable: true,
  })
  planId: string | null;

  @ApiProperty({
    type: String,
    example: 'Unlimited',
    description: 'Name of the plan the member is currently on, null if none',
    nullable: true,
  })
  planName: string | null;

  @ApiProperty({
    type: Date,
    example: '2026-09-01T00:00:00.000Z',
    description:
      'When the current plan lapses. Null means the plan is unlimited or the member has no plan.',
    nullable: true,
  })
  expiresAt: Date | null;

  @ApiProperty({
    enum: ['active', 'expiring', 'expired', 'inactive'],
    example: 'active',
    description:
      'Derived plan health: inactive when the membership is suspended, expired when there is no active plan or it has lapsed, expiring within 7 days of the expiry date, otherwise active',
  })
  membershipStatus: 'active' | 'expiring' | 'expired' | 'inactive';

  @ApiProperty({
    example: true,
    description:
      'Whether the current plan rolls forward automatically when it expires',
  })
  autoRoll: boolean;

  @ApiProperty({
    example: 3,
    description:
      'How many times the current plan has auto-renewed since auto-renew was last switched on',
  })
  autoRollCount: number;
}
