import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleLoggableStatusDto {
  @ApiProperty({ example: 'uuid-class-id' })
  @IsUUID()
  classId: string;
}
