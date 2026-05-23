import { ApiProperty } from '@nestjs/swagger';
import { CoachClassItemDto } from './coach-class-item.dto';

export class GetCoachClassesResponseDto {
  @ApiProperty({
    type: [CoachClassItemDto],
    description:
      'List of classes assigned to the authenticated coach in this gym',
  })
  classes: CoachClassItemDto[];
}
