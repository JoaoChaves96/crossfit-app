import { ApiProperty } from '@nestjs/swagger';

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
    description: 'Email address the invite was sent to',
    example: 'athlete@example.com',
  })
  inviteeEmail: string;

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
