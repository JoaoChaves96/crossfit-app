import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateGymProfileDto {
  @ApiPropertyOptional({
    example: 'CrossFit Downtown',
    description: 'Updated name of the gym',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    example: 'A community-driven CrossFit box focused on functional fitness.',
    description: 'Updated description of the gym',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: '123 Main St, New York, NY',
    description: 'Updated physical location of the gym',
    minLength: 1,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  location?: string;
}
