import { ApiProperty } from '@nestjs/swagger';
import { ClassTypeItemDto } from './class-type-item.dto';

export class GetClassTypesResponseDto {
  @ApiProperty({
    type: [ClassTypeItemDto],
    description: 'List of class types for the gym',
  })
  classTypes: ClassTypeItemDto[];
}
