import { ApiProperty } from '@nestjs/swagger';

export class DeleteSpaceResponseDto {
  @ApiProperty({ example: 'uuid-space-id' })
  id: string;

  @ApiProperty({ example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ example: 'Main Floor' })
  name: string;

  @ApiProperty({ example: 20 })
  baseCapacity: number;

  @ApiProperty({ example: '2024-06-01T00:00:00.000Z' })
  deletedAt: Date;
}
