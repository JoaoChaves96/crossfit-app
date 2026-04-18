import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateSpaceCommand } from '../update-space.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { UpdateSpaceResponseDto } from '../dto/update-space-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpaceEntity } from '../../../domain/space/entities/space.entity';

/**
 * UpdateSpaceHandler: Orchestrates space updates
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Update SpaceEntity with provided fields
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: UpdateSpace command specification
 */
@CommandHandler(UpdateSpaceCommand)
export class UpdateSpaceHandler implements ICommandHandler<UpdateSpaceCommand> {
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService) private readonly spaceService: SpaceService,
    @InjectRepository(SpaceEntity)
    private readonly spaceRepository: Repository<SpaceEntity>,
  ) {}

  async execute(command: UpdateSpaceCommand): Promise<UpdateSpaceResponseDto> {
    // Precondition 1: Verify space exists
    const space = await this.spaceService.getSpaceById(command.spaceId);
    if (!space) {
      throw new NotFoundException('Space not found');
    }

    // Precondition 2: Verify user is gym owner for the space's gym
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      space.gymId,
    );
    if (!isOwner) {
      throw new ForbiddenException('User is not a gym owner for this gym');
    }

    // Precondition 3: If name is changed, verify uniqueness per gym
    if (command.name !== undefined && command.name !== space.name) {
      const existingSpaces = await this.spaceService.getSpacesByGym(
        space.gymId,
      );
      const nameExists = existingSpaces.some(
        (s) => s.name === command.name && s.id !== command.spaceId,
      );
      if (nameExists) {
        throw new BadRequestException(
          'Space with this name already exists in this gym',
        );
      }
    }

    // Precondition 4: If capacity is changed, verify > 0
    if (command.baseCapacity !== undefined && command.baseCapacity <= 0) {
      throw new BadRequestException('Capacity must be greater than 0');
    }

    // State Change: Update SpaceEntity with provided fields only
    if (command.name !== undefined) {
      space.name = command.name;
    }
    if (command.baseCapacity !== undefined) {
      space.baseCapacity = command.baseCapacity;
    }

    // Persist via repository
    const updatedSpace = await this.spaceRepository.save(space);

    // Map to response DTO
    return this.mapToResponseDto(updatedSpace);
  }

  private mapToResponseDto(space: SpaceEntity): UpdateSpaceResponseDto {
    return {
      id: space.id,
      gymId: space.gymId,
      name: space.name,
      baseCapacity: space.baseCapacity,
      deletedAt: space.deletedAt,
    };
  }
}
