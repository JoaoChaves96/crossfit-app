import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateNotificationPreferencesDto } from '../../../queries/user/dto/notification-preferences.dto';

export class UpdateUserProfileDto {
  @ApiProperty({ description: 'User display name', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Notification preferences (partial update)',
    required: false,
    type: UpdateNotificationPreferencesDto,
  })
  @ValidateNested()
  @Type(() => UpdateNotificationPreferencesDto)
  @IsOptional()
  notificationPreferences?: UpdateNotificationPreferencesDto;
}
