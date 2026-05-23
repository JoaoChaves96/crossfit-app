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

    user.name = command.name;
    const updated = await this.userService.saveUser(user);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      createdAt: updated.createdAt,
    };
  }
}
