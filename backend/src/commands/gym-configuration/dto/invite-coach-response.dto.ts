import { ApiProperty } from '@nestjs/swagger';

export class InviteCoachResponseDto {
  @ApiProperty({ example: 'uuid-gym-staff-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'uuid-coach-user-id' })
  userId: string;

  @ApiProperty({ enum: ['owner', 'coach'], example: 'coach' })
  role: 'owner' | 'coach';

  @ApiProperty({ enum: ['active', 'inactive'], example: 'active' })
  status: 'active' | 'inactive';

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  assignedAt: Date;
}
