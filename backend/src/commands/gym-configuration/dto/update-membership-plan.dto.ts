import {
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMembershipPlanDto {
  @ApiProperty({ example: 'Gold Plan', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 12900, minimum: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  pricing?: number;

  @ApiProperty({ enum: ['monthly', 'annual'], example: 'annual', required: false })
  @IsOptional()
  @IsEnum(['monthly', 'annual'])
  billingCycle?: 'monthly' | 'annual';

  @ApiProperty({ example: ['uuid-class-type-id-1'], type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classTypes?: string[];
}
