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
      // Only merge keys that were actually sent. With `useDefineForClassFields`
      // (TS target ES2023), class-transformer instantiates the nested DTO with
      // every declared field as an own property — the unsent ones set to
      // `undefined`. Spreading the DTO directly would overwrite the stored
      // `true`s with `undefined`, and JSON/jsonb serialization drops those keys,
      // silently wiping the other preferences on any partial update.
      const sentPrefs = Object.fromEntries(
        Object.entries(command.notificationPreferences).filter(
          ([, value]) => value !== undefined,
        ),
      );
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...sentPrefs,
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
