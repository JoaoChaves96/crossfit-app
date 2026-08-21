import { ApiProperty } from '@nestjs/swagger';

export class ValidateResetTokenResponseDto {
  @ApiProperty({
    description:
      'Whether the reset link can still be used. False covers unknown, expired and already-used alike — the three are not distinguished.',
    example: true,
  })
  valid: boolean;
}
