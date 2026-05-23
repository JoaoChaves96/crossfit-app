import {
  IsString,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMembershipPlanDto {
  @ApiProperty({ example: 'Premium Plan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 9900, description: 'Price in cents', minimum: 1 })
  @IsInt()
  @Min(1)
  pricing: number;

  @ApiProperty({ enum: ['monthly', 'annual'], example: 'monthly' })
  @IsEnum(['monthly', 'annual'])
  billingCycle: 'monthly' | 'annual';

  @ApiProperty({
    example: ['uuid-class-type-id-1', 'uuid-class-type-id-2'],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  classTypes: string[];
}
