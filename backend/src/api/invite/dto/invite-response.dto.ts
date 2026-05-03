import { ApiProperty } from '@nestjs/swagger';

export class InviteResponseDto {
  @ApiProperty({
    description: 'The unique invite token used in the invite link',
    example: 'abc123xyz...',
  })
  inviteToken: string;

  @ApiProperty({
    description: 'The full invite link to be shared with the invitee',
    example: 'https://app.example.com/invite/abc123xyz',
  })
  inviteLink: string;

  @ApiProperty({
    description: 'ISO timestamp when the invite expires (7 days from creation)',
    example: '2026-05-10T12:00:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description: 'Email address the invite was sent to',
    example: 'athlete@example.com',
  })
  inviteeEmail: string;
}
