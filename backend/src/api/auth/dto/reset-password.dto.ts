import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'The token from the reset link',
    example: 'k7Qd3Zk1t0m9vY6bF2sN8pR4wJ5xL1cH0aT7uE3gQ2i',
  })
  @IsString()
  @MinLength(1)
  token: string;

  // Deliberately identical to RegisterDto's rule. A stricter rule here would
  // strand users who registered under the looser one; a looser one would let an
  // account be reset into a password it could never have registered with.
  @ApiProperty({
    description: 'The new password (minimum 1 character)',
    example: 'secret123',
  })
  @IsString()
  @MinLength(1)
  password: string;
}
