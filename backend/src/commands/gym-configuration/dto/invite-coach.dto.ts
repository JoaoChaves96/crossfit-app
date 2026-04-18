import { IsEmail } from 'class-validator';

export class InviteCoachDto {
  @IsEmail()
  coachEmail: string;
}
