import { ApiProperty } from '@nestjs/swagger';

export class CreateSpaceResponseDto {
  @ApiProperty({ example: 'uuid-space-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'Main Floor' })
  name: string;

  @ApiProperty({ example: 20 })
  baseCapacity: number;

  @ApiProperty({ example: null, nullable: true })
  deletedAt: Date | null;
}
