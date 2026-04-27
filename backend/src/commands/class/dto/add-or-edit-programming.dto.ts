import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddOrEditProgrammingDto {
  @ApiProperty({ example: 'uuid-class-id' })
  @IsUUID()
  classId: string;

  @ApiProperty({ example: '5 rounds: 20 box jumps, 15 pull-ups, 10 burpees. For time.' })
  @IsString()
  content: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  loggable?: boolean;
}
