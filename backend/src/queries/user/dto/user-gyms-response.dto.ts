import { ApiProperty } from '@nestjs/swagger';

export class UserGymDto {
  @ApiProperty({ description: 'Gym ID', example: 'uuid-gym-id' })
  gymId: string;

  @ApiProperty({ description: 'Gym name', example: 'CrossFit Downtown' })
  gymName: string;

  @ApiProperty({
    description: "The caller's role at this gym",
    enum: ['owner', 'coach', 'athlete'],
    example: 'coach',
  })
  role: 'owner' | 'coach' | 'athlete';
}

export class GetUserGymsResponseDto {
  @ApiProperty({
    description:
      'Every gym the caller is actively attached to, staff first. More than one entry means the gym switcher applies.',
    type: [UserGymDto],
  })
  gyms: UserGymDto[];
}
