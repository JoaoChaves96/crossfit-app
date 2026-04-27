import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteCoachDto {
  @ApiProperty({ example: 'coach@example.com', maxLength: 254 })
  @IsEmail()
  @MaxLength(254, { message: 'Email must be under 254 characters' })
  coachEmail: string;
}
