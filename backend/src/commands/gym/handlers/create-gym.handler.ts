import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { CreateGymCommand } from '../create-gym.command';
import { CreateGymResponseDto } from '../dto/create-gym-response.dto';
import { GymEntity } from '../../../domain/gym/entities/gym.entity';
import { GymStaffEntity } from '../../../domain/gym-staff/entities/gym-staff.entity';
import { UserService } from '../../../domain/user/user.service';

@CommandHandler(CreateGymCommand)
export class CreateGymHandler implements ICommandHandler<CreateGymCommand> {
  constructor(
    @InjectRepository(GymEntity)
    private readonly gymRepository: Repository<GymEntity>,
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  async execute(command: CreateGymCommand): Promise<CreateGymResponseDto> {
    const user = await this.userService.getUserById(command.userId);
    if (!user) {
      throw new NotFoundException('Authenticated user not found');
    }

    const gym = new GymEntity();
    gym.id = uuid();
    gym.name = command.name;
    gym.location = command.location;
    gym.description = command.description ?? null;
    gym.logoUrl = null;
    gym.ownerUserId = command.userId;
    gym.status = 'pending_approval';

    const savedGym = await this.gymRepository.save(gym);

    const gymStaff = new GymStaffEntity();
    gymStaff.id = uuid();
    gymStaff.gymId = savedGym.id;
    gymStaff.userId = command.userId;
    gymStaff.role = 'owner';
    gymStaff.status = 'active';

    await this.gymStaffRepository.save(gymStaff);

    return {
      id: savedGym.id,
      name: savedGym.name,
      location: savedGym.location,
      description: savedGym.description,
      ownerId: savedGym.ownerUserId,
      createdAt: savedGym.createdAt,
    };
  }
}
