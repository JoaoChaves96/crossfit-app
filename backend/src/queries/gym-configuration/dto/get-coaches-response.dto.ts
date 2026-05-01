import { ApiProperty } from '@nestjs/swagger';
import { CoachListItemDto } from './coach-list-item.dto';

export class GetCoachesResponseDto {
  @ApiProperty({
    type: [CoachListItemDto],
    description: 'List of coaches for the gym',
  })
  coaches: CoachListItemDto[];
}
