import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BookClassDto {
  @ApiProperty({ example: 'uuid-class-id' })
  @IsUUID()
  classId: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  @IsUUID()
  gymId: string;
}
