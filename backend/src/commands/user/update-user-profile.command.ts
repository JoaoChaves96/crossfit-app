import { ICommand } from '@nestjs/cqrs';
import { UpdateNotificationPreferencesDto } from '../../queries/user/dto/notification-preferences.dto';

export class UpdateUserProfileCommand implements ICommand {
  constructor(
    readonly userId: string,
    readonly name?: string,
    readonly notificationPreferences?: UpdateNotificationPreferencesDto,
  ) {}
}
