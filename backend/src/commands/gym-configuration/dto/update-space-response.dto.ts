import { ApiProperty } from '@nestjs/swagger';

export class UpdateSpaceResponseDto {
  @ApiProperty({ example: 'uuid-space-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'Rig Room' })
  name: string;

  @ApiProperty({ example: 25 })
  baseCapacity: number;

  @ApiProperty({ type: Date, example: null, nullable: true })
  deletedAt: Date | null;
}
