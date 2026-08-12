import { ApiProperty } from '@nestjs/swagger';

export class GymMembershipStatusResponseDto {
  @ApiProperty({ example: 'uuid-gym-membership-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'uuid-user-id' })
  userId: string;

  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'inactive',
    description:
      'Suspending a member leaves their plan untouched; it only blocks them from the gym',
  })
  status: 'active' | 'inactive';

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  joinedAt: Date;
}
