import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class UpdateSpaceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  baseCapacity?: number;
}
