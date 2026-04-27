import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManuallyAddMemberDto {
  @ApiProperty({ example: 'uuid-athlete-user-id' })
  @IsString()
  athleteUserId: string;

  @ApiProperty({ example: 'uuid-membership-plan-id', required: false })
  @IsOptional()
  @IsString()
  membershipPlanId?: string;
}
