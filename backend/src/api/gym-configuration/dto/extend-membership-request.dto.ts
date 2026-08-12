import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ExtendMembershipRequestDto {
  @ApiProperty({
    example: '2026-10-01T00:00:00.000Z',
    description:
      'New expiry date for the member’s plan. Must be in the future. Extending a lapsed plan revives it.',
  })
  @IsDateString()
  expiresAt: string;
}
