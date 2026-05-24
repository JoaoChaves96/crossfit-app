import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { UpdateUserProfileCommand } from '../update-user-profile.command';
import { UserProfileDto } from '../../../queries/user/dto/user-profile.dto';
import { UserService } from '../../../domain/user/user.service';

@CommandHandler(UpdateUserProfileCommand)
export class UpdateUserProfileHandler
  implements ICommandHandler<UpdateUserProfileCommand>
{
  constructor(private readonly userService: UserService) {}

  async execute(command: UpdateUserProfileCommand): Promise<UserProfileDto> {
    const user = await this.userService.getUserById(command.userId);

    if (!user) {
      throw new NotFoundException(`User ${command.userId} not found`);
    }

    if (command.name !== undefined) {
      user.name = command.name;
    }

    if (command.notificationPreferences !== undefined) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...command.notificationPreferences,
      };
    }

    const updated = await this.userService.saveUser(user);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      notificationPreferences: updated.notificationPreferences,
      createdAt: updated.createdAt,
    };
  }
}
