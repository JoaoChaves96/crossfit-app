import { ApiProperty } from '@nestjs/swagger';
import type { InviteDeliveryStatus } from '../../../domain/invite/invite-delivery.types';

export class InviteCoachResponseDto {
  @ApiProperty({
    description: 'Opaque token identifying the invite',
    example: 'AbC123...',
  })
  inviteToken: string;

  @ApiProperty({
    description:
      'Full acceptance URL. Also emailed to the invitee; kept in the response so the owner can ' +
      'pass it on themselves, which is the fallback when delivery is "failed".',
    example: 'https://app.boxops.dev/invite/AbC123...',
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

  @ApiProperty({
    description:
      'Whether the invite email was delivered. "failed" means the invite is still valid and its ' +
      'token still usable — the caller must pass the link on by hand.',
    enum: ['sent', 'failed'],
    example: 'sent',
  })
  delivery: InviteDeliveryStatus;
}
