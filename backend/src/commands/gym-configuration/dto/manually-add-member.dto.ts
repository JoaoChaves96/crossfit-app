import { IsString, IsOptional } from 'class-validator';

export class ManuallyAddMemberDto {
  @IsString()
  athleteUserId: string;

  @IsOptional()
  @IsString()
  membershipPlanId?: string;
}
