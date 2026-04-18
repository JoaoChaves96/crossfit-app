import {
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  IsOptional,
} from 'class-validator';

export class UpdateMembershipPlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pricing?: number;

  @IsOptional()
  @IsEnum(['monthly', 'annual'])
  billingCycle?: 'monthly' | 'annual';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classTypes?: string[];
}
