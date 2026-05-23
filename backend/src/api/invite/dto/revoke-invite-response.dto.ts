import { ApiProperty } from '@nestjs/swagger';

export class RevokeInviteResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Invite revoked',
  })
  message: string;
}
