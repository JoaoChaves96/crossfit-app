import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'athlete@example.com',
  })
  @IsEmail()
  inviteeEmail: string;
}
