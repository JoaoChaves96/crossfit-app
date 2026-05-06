import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { UpdateGymProfileCommand } from '../update-gym-profile.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymProfileDto } from '../../../queries/gym-configuration/dto/gym-profile.dto';

@CommandHandler(UpdateGymProfileCommand)
export class UpdateGymProfileHandler
  implements ICommandHandler<UpdateGymProfileCommand>
{
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
  ) {}

  async execute(command: UpdateGymProfileCommand): Promise<GymProfileDto> {
    const gym = await this.gymService.getGymById(command.gymId);

    if (!gym) {
      throw new NotFoundException(`Gym with id ${command.gymId} not found`);
    }

    if (command.name !== undefined) {
      gym.name = command.name;
    }

    if (command.description !== undefined) {
      gym.description = command.description;
    }

    if (command.location !== undefined) {
      gym.location = command.location;
    }

    const saved = await this.gymService.saveGym(gym);

    return {
      id: saved.id,
      name: saved.name,
      description: saved.description,
      location: saved.location,
      status: saved.status,
      createdAt: saved.createdAt,
    };
  }
}
