import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateSpaceCommand } from '../create-space.command';
import { SpaceEntity } from '../../../domain/space/entities/space.entity';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { CreateSpaceResponseDto } from '../dto/create-space-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

/**
 * CreateSpaceHandler: Orchestrates space creation
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Create SpaceEntity with proper initial state
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: CreateSpace command specification
 */
@CommandHandler(CreateSpaceCommand)
export class CreateSpaceHandler implements ICommandHandler<CreateSpaceCommand> {
  constructor(
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService) private readonly spaceService: SpaceService,
    @InjectRepository(SpaceEntity)
    private readonly spaceRepository: Repository<SpaceEntity>,
  ) {}

  async execute(command: CreateSpaceCommand): Promise<CreateSpaceResponseDto> {
    // Precondition 1: Verify user is gym owner
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 2: Verify gym exists and is active
    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (gym.status !== 'active') {
      throw new BadRequestException('Gym is not active');
    }

    // Precondition 3: Verify name is unique per gym
    const existingSpaces = await this.spaceService.getSpacesByGym(
      command.gymId,
    );
    const nameExists = existingSpaces.some((s) => s.name === command.name);
    if (nameExists) {
      throw new BadRequestException(
        'Space with this name already exists in this gym',
      );
    }

    // Precondition 4: Verify capacity > 0
    if (command.baseCapacity <= 0) {
      throw new BadRequestException('Capacity must be greater than 0');
    }

    // State Change: Create SpaceEntity
    const space = new SpaceEntity();
    space.id = uuid();
    space.gymId = command.gymId;
    space.name = command.name;
    space.baseCapacity = command.baseCapacity;
    space.deletedAt = null;

    // Persist via repository
    const savedSpace = await this.spaceRepository.save(space);

    // Map to response DTO
    return this.mapToResponseDto(savedSpace);
  }

  private mapToResponseDto(space: SpaceEntity): CreateSpaceResponseDto {
    return {
      id: space.id,
      gymId: space.gymId,
      name: space.name,
      baseCapacity: space.baseCapacity,
      deletedAt: space.deletedAt,
    };
  }
}
