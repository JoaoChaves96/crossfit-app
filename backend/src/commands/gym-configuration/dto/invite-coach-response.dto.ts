import { ApiProperty } from '@nestjs/swagger';

export class InviteCoachResponseDto {
  @ApiProperty({
    description: 'Opaque token identifying the invite',
    example: 'AbC123...',
  })
  inviteToken: string;

  @ApiProperty({
    description:
      'Full acceptance URL. Email delivery is not implemented, so the owner copies this and sends it themselves.',
    example: 'https://app.crossfitbox.com/invite/AbC123...',
  })
  inviteLink: string;

  @ApiProperty({
    description: 'ISO timestamp when the invite expires (7 days out)',
    example: '2026-08-20T10:00:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Email address the invite was created for',
    example: 'coach@example.com',
  })
  inviteeEmail: string;

  @ApiProperty({
    description: 'What accepting this invite makes the invitee',
    enum: ['coach'],
    example: 'coach',
  })
  role: 'coach';
}
