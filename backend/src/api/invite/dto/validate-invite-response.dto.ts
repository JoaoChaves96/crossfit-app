import { ApiProperty } from '@nestjs/swagger';
import type { InviteRole } from '../../../domain/invite/entities/invite.entity';

export class ValidateInviteResponseDto {
  @ApiProperty({
    description: 'ID of the gym the invite belongs to',
    example: 'uuid-gym-id',
  })
  gymId: string;

  @ApiProperty({
    description: 'Name of the gym the invite belongs to',
    example: 'CrossFit Downtown',
  })
  gymName: string;

  @ApiProperty({
    description: 'Location of the gym the invite belongs to',
    example: 'Downtown, New York',
  })
  gymLocation: string;

  @ApiProperty({
    description: 'Email address the invite was sent to',
    example: 'athlete@example.com',
  })
  inviteeEmail: string;

  @ApiProperty({
    description: 'Full name of the person who created the invite',
    example: 'Sarah Johnson',
  })
  inviterName: string;

  @ApiProperty({
    description: 'Role of the inviter in the gym',
    enum: ['owner', 'coach'],
    example: 'coach',
  })
  inviterRole: 'owner' | 'coach';

  @ApiProperty({
    description: 'What accepting this invite makes the invitee',
    enum: ['athlete', 'coach'],
    example: 'coach',
  })
  role: InviteRole;

  @ApiProperty({
    description: 'ISO timestamp when the invite expires',
    example: '2026-05-10T12:00:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Current status of the invite',
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    example: 'pending',
  })
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}
