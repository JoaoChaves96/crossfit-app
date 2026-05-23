import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class NotificationPreferencesDto {
  @ApiProperty({ description: 'Receive booking confirmation notifications' })
  @IsBoolean()
  booking_confirmations: boolean;

  @ApiProperty({ description: 'Receive waitlist update notifications' })
  @IsBoolean()
  waitlist_updates: boolean;

  @ApiProperty({ description: 'Receive class change notifications' })
  @IsBoolean()
  class_changes: boolean;

  @ApiProperty({ description: 'Receive class reminder notifications' })
  @IsBoolean()
  class_reminders: boolean;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ description: 'Receive booking confirmation notifications', required: false })
  @IsBoolean()
  @IsOptional()
  booking_confirmations?: boolean;

  @ApiProperty({ description: 'Receive waitlist update notifications', required: false })
  @IsBoolean()
  @IsOptional()
  waitlist_updates?: boolean;

  @ApiProperty({ description: 'Receive class change notifications', required: false })
  @IsBoolean()
  @IsOptional()
  class_changes?: boolean;

  @ApiProperty({ description: 'Receive class reminder notifications', required: false })
  @IsBoolean()
  @IsOptional()
  class_reminders?: boolean;
}
