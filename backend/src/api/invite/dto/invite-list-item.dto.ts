import { ApiProperty } from '@nestjs/swagger';
export class InviteListItemDto {
  @ApiProperty({
    description: 'Unique identifier of the invite',
    example: 'uuid-invite-id',
  })
  id!: string;

  @ApiProperty({
    description: 'Email address the invite was sent to',
    example: 'athlete@example.com',
  })
  inviteeEmail!: string;

  @ApiProperty({
    description: 'Unique invite token used in the invite link',
    example: 'abc123xyz...',
  })
  inviteToken!: string;

  @ApiProperty({
    description: 'Current status of the invite',
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    example: 'pending',
  })
  status!: string;

  @ApiProperty({
    description: 'ISO timestamp when the invite was created',
    example: '2026-05-01T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'ISO timestamp when the invite expires',
    example: '2026-05-08T10:00:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    type: String,
    description:
      'ISO timestamp when the invite was accepted, or null if not accepted',
    example: '2026-05-03T14:00:00.000Z',
    nullable: true,
  })
  acceptedAt!: string | null;
}
