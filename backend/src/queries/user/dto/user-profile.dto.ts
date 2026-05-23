import { ApiProperty } from '@nestjs/swagger';
import { NotificationPreferencesDto } from './notification-preferences.dto';

export class UserProfileDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'User display name' })
  name: string;

  @ApiProperty({ description: 'User account status', enum: ['active', 'inactive'] })
  status: 'active' | 'inactive';

  @ApiProperty({ description: 'Notification preferences', type: NotificationPreferencesDto })
  notificationPreferences: NotificationPreferencesDto;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;
}
