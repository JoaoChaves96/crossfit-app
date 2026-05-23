import { ApiProperty } from '@nestjs/swagger';
import { NotificationPreferencesDto } from './notification-preferences.dto';

export class UserProfileDto {
  @ApiProperty({ description: 'Unique user identifier (UUID)' })
  id: string;

  @ApiProperty({ description: 'Display name of the user' })
  name: string;

  @ApiProperty({ description: 'Email address of the user (read-only)' })
  email: string;

  @ApiProperty({ description: 'Notification preferences', type: NotificationPreferencesDto })
  notificationPreferences: NotificationPreferencesDto;

  @ApiProperty({ description: 'Date the user account was created' })
  createdAt: Date;
}
