import { ApiProperty } from '@nestjs/swagger';

export class SpaceItemDto {
  @ApiProperty({
    example: 'uuid-space-id',
    description: 'Unique identifier for the space',
  })
  id: string;

  @ApiProperty({
    example: 'Main Floor',
    description: 'Name of the training space',
  })
  name: string;

  @ApiProperty({
    example: 20,
    description: 'Default maximum number of athletes the space can hold',
  })
  baseCapacity: number;
}
