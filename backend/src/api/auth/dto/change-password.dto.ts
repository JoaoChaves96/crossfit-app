import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'The password currently on the account',
    example: 'secret123',
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;

  // The same rule as RegisterDto and ResetPasswordDto, deliberately. A real
  // password policy is a cross-cutting decision that has to land on all three
  // at once; introducing it here alone would make the strength of an account's
  // password depend on which screen last set it.
  @ApiProperty({
    description: 'The new password (minimum 1 character)',
    example: 'evenmoresecret456',
  })
  @IsString()
  @MinLength(1)
  newPassword: string;
}
