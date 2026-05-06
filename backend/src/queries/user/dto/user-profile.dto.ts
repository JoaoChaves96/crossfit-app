import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ description: 'Unique user identifier (UUID)' })
  id: string;

  @ApiProperty({ description: 'Display name of the user' })
  name: string;

  @ApiProperty({ description: 'Email address of the user (read-only)' })
  email: string;

  @ApiProperty({ description: 'Date the user account was created' })
  createdAt: Date;
}
