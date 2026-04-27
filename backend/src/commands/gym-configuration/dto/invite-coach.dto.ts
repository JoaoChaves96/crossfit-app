import { IsEmail, MaxLength } from 'class-validator';

export class InviteCoachDto {
  @IsEmail()
  @MaxLength(254, { message: 'Email must be under 254 characters' })
  coachEmail: string;
}
