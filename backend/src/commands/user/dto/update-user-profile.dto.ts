import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateNotificationPreferencesDto } from '../../../queries/user/dto/notification-preferences.dto';

export class UpdateUserProfileDto {
  @ApiProperty({ description: 'New display name for the user', minLength: 1, required: false })
  @IsString()
  @MinLength(1)
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
