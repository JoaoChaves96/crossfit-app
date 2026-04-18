import {
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  ArrayMinSize,
} from 'class-validator';

export class CreateMembershipPlanDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  pricing: number;

  @IsEnum(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  classTypes: string[];
}
