import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { DeleteSpaceCommand } from '../delete-space.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { DeleteSpaceResponseDto } from '../dto/delete-space-response.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SpaceEntity } from '../../../domain/space/entities/space.entity';
import { ClassEntity } from '../../../domain/class/entities/class.entity';

/**
 * DeleteSpaceHandler: Orchestrates space deletion (soft delete)
 *
 * Responsibilities:
 * - Enforce all preconditions from COMMAND_MODEL.md
 * - Soft-delete SpaceEntity (set deletedAt timestamp)
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: DeleteSpace command specification
 */
@CommandHandler(DeleteSpaceCommand)
export class DeleteSpaceHandler implements ICommandHandler<DeleteSpaceCommand> {
  constructor(
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService) private readonly spaceService: SpaceService,
    @InjectRepository(SpaceEntity)
    private readonly spaceRepository: Repository<SpaceEntity>,
    @InjectRepository(ClassEntity)
    private readonly classRepository: Repository<ClassEntity>,
  ) {}

  async execute(command: DeleteSpaceCommand): Promise<DeleteSpaceResponseDto> {
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

    // Precondition 3: Verify no active classes are assigned to this space
    const activeClasses = await this.classRepository.find({
      where: [
        { spaceId: command.spaceId, state: 'published' },
        { spaceId: command.spaceId, state: 'booking_closed' },
        { spaceId: command.spaceId, state: 'in_progress' },
      ],
    });

    if (activeClasses.length > 0) {
      throw new BadRequestException(
        'Cannot delete space with active classes assigned',
      );
    }

    // State Change: Soft delete SpaceEntity
    space.deletedAt = new Date();

    // Persist via repository
    const deletedSpace = await this.spaceRepository.save(space);

    // Map to response DTO
    return this.mapToResponseDto(deletedSpace);
  }

  private mapToResponseDto(space: SpaceEntity): DeleteSpaceResponseDto {
    return {
      id: space.id,
      gymId: space.gymId,
      name: space.name,
      baseCapacity: space.baseCapacity,
      deletedAt: space.deletedAt!,
    };
  }
}
