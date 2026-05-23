import { ApiProperty } from '@nestjs/swagger';
import { SpaceItemDto } from './space-item.dto';

export class GetSpacesResponseDto {
  @ApiProperty({
    type: [SpaceItemDto],
    description: 'List of training spaces for the gym',
  })
  spaces: SpaceItemDto[];
}
