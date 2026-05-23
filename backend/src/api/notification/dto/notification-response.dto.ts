import { ApiProperty } from '@nestjs/swagger';

export class NotificationItemDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Gym ID' })
  gymId: string;

  @ApiProperty({
    description: 'Notification type',
    enum: [
      'booking_confirmed',
      'waitlist_promoted',
      'class_cancelled',
      'class_changed',
      'class_reminder',
    ],
  })
  type: string;

  @ApiProperty({ description: 'Notification title' })
  title: string;

  @ApiProperty({ description: 'Notification body text' })
  body: string;

  @ApiProperty({ description: 'Additional data payload', type: Object })
  data: Record<string, string>;

  @ApiProperty({ description: 'Whether the notification has been read' })
  read: boolean;

  @ApiProperty({ description: 'When the notification was created' })
  createdAt: Date;
}

export class GetNotificationsResponseDto {
  @ApiProperty({ type: [NotificationItemDto], description: 'Notification list' })
  items: NotificationItemDto[];

  @ApiProperty({ description: 'Total number of notifications' })
  total: number;

  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Number of unread notifications' })
  unreadCount: number;
}
