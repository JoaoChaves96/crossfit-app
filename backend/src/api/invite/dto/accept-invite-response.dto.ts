import { ApiProperty } from '@nestjs/swagger';

export class AcceptInviteGymDto {
  @ApiProperty({ description: 'Gym ID', example: 'uuid-gym-id' })
  id: string;

  @ApiProperty({ description: 'Gym name', example: 'CrossFit Downtown' })
  name: string;
}

export class AcceptInviteAthleteDto {
  @ApiProperty({ description: 'Athlete user ID', example: 'uuid-user-id' })
  id: string;

  @ApiProperty({
    description: 'Athlete email address',
    example: 'athlete@example.com',
  })
  email: string;
}

export class AcceptInviteResponseDto {
  @ApiProperty({ description: 'Gym details', type: AcceptInviteGymDto })
  gym: AcceptInviteGymDto;

  @ApiProperty({
    description: 'Athlete details',
    type: AcceptInviteAthleteDto,
  })
  athlete: AcceptInviteAthleteDto;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'Successfully joined gym',
  })
  message: string;
}
