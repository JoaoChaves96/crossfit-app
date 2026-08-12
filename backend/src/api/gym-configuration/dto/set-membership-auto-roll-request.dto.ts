import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetMembershipAutoRollRequestDto {
  @ApiProperty({
    example: false,
    description:
      'Whether the member’s plan should roll forward automatically on expiry. Turning it on resets the renewal count.',
  })
  @IsBoolean()
  autoRoll: boolean;
}
