import { ApiProperty } from '@nestjs/swagger';
import type { InviteRole } from '../../../domain/invite/entities/invite.entity';

export class AcceptInviteGymDto {
  @ApiProperty({ description: 'Gym ID', example: 'uuid-gym-id' })
  id: string;

  @ApiProperty({ description: 'Gym name', example: 'CrossFit Downtown' })
  name: string;
}

export class AcceptInviteUserDto {
  @ApiProperty({ description: 'User ID', example: 'uuid-user-id' })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'athlete@example.com',
  })
  email: string;
}

export class AcceptInviteResponseDto {
  @ApiProperty({ description: 'Gym details', type: AcceptInviteGymDto })
  gym: AcceptInviteGymDto;

  @ApiProperty({ description: 'The accepting user', type: AcceptInviteUserDto })
  user: AcceptInviteUserDto;

  @ApiProperty({
    description: 'What the invitee became at this gym',
    enum: ['athlete', 'coach'],
    example: 'coach',
  })
  role: InviteRole;

  @ApiProperty({
    description:
      'Freshly signed JWT carrying the new gym context. The client MUST replace its stored token with this one.',
    example: 'eyJhbGciOi...',
  })
  token: string;

  @ApiProperty({
    description: 'Confirmation message',
    example: 'Successfully joined gym as coach',
  })
  message: string;
}
