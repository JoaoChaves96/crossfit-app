import { ApiProperty } from '@nestjs/swagger';

export class GymMemberItemDto {
  @ApiProperty({
    example: 'uuid-membership-id',
    description: 'Unique identifier for the gym membership record',
  })
  id: string;

  @ApiProperty({
    example: 'uuid-user-id',
    description: 'User ID of the member',
  })
  userId: string;

  @ApiProperty({
    example: 'Jane Doe',
    description: 'Full name of the member',
  })
  name: string;

  @ApiProperty({
    example: 'jane@example.com',
    description: 'Email address of the member',
  })
  email: string;

  @ApiProperty({
    enum: ['active', 'inactive'],
    example: 'active',
    description: 'Current membership status',
  })
  status: 'active' | 'inactive';

  @ApiProperty({
    example: '2024-01-15T10:00:00.000Z',
    description: 'Date and time the member joined the gym',
  })
  joinedAt: Date;
}
