import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchGymContextDto {
  @ApiProperty({
    description: 'The gym to switch the session context to',
    example: 'uuid-gym-id',
  })
  @IsUUID()
  gymId: string;
}
