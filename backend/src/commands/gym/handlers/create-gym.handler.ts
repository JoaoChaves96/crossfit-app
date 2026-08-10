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
import { AuthService } from '../../../domain/auth/auth.service';

@CommandHandler(CreateGymCommand)
export class CreateGymHandler implements ICommandHandler<CreateGymCommand> {
  constructor(
    @InjectRepository(GymEntity)
    private readonly gymRepository: Repository<GymEntity>,
    @InjectRepository(GymStaffEntity)
    private readonly gymStaffRepository: Repository<GymStaffEntity>,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(AuthService) private readonly authService: AuthService,
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
    // Auto-approved for MVP, as COMMAND_MODEL.md → RegisterGym permits. Every
    // configuration command requires an active gym, and no platform-admin
    // approval endpoint exists yet, so creating this pending_approval would
    // leave the gym permanently unconfigurable. Admin approval is Phase 2.
    gym.status = 'active';

    const savedGym = await this.gymRepository.save(gym);

    const gymStaff = new GymStaffEntity();
    gymStaff.id = uuid();
    gymStaff.gymId = savedGym.id;
    gymStaff.userId = command.userId;
    gymStaff.role = 'owner';
    gymStaff.status = 'active';

    await this.gymStaffRepository.save(gymStaff);

    // The caller's existing token still claims `gymId: null` — it was signed
    // before this gym existed. Hand back a re-signed one so the very next
    // request (configuring spaces and class types) passes GymOwnershipGuard
    // without forcing the user to log out and back in.
    const accessToken = await this.authService.issueTokenForUser(
      command.userId,
    );

    return {
      id: savedGym.id,
      name: savedGym.name,
      location: savedGym.location,
      description: savedGym.description,
      ownerId: savedGym.ownerUserId,
      createdAt: savedGym.createdAt,
      accessToken,
    };
  }
}
