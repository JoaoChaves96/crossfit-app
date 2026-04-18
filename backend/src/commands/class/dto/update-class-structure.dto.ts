import { IsUUID, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateClassStructureDto {
  @IsUUID()
  classId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsUUID()
  spaceId?: string;
}
