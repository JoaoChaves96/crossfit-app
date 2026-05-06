import { ApiProperty } from '@nestjs/swagger';
import { GymMemberItemDto } from './gym-member-item.dto';

export class GetGymMembersResponseDto {
  @ApiProperty({
    type: [GymMemberItemDto],
    description: 'List of active members for the gym, sorted by join date descending',
  })
  members: GymMemberItemDto[];
}
