import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 1 character)',
    example: 'secret123',
  })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiProperty({
    description: 'User full name',
    example: 'Jane Doe',
  })
  @IsString()
  @MinLength(1)
  name: string;
}
