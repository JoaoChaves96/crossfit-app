import { IsString, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSpaceDto {
  @ApiProperty({ example: 'Rig Room', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 25, minimum: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  baseCapacity?: number;
}
