import { IsUUID, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateClassStructureDto {
  @ApiProperty({ example: 'uuid-class-id' })
  @IsUUID()
  classId: string;

  @ApiProperty({ example: 25, minimum: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({ example: 'uuid-space-id', required: false })
  @IsOptional()
  @IsUUID()
  spaceId?: string;
}
