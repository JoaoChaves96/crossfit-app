import { ApiProperty } from '@nestjs/swagger';
import type { InviteRole } from '../../../domain/invite/entities/invite.entity';
import type { InviteDeliveryStatus } from '../../../domain/invite/invite-delivery.types';

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

  @ApiProperty({
    description: 'What accepting this invite makes the invitee',
    enum: ['athlete', 'coach'],
    example: 'coach',
  })
  role: InviteRole;

  @ApiProperty({
    description:
      'Whether the invite email was delivered. "failed" means the invite is still valid and its ' +
      'token still usable — the caller must pass the link on by hand.',
    enum: ['sent', 'failed'],
    example: 'sent',
  })
  delivery: InviteDeliveryStatus;
}
