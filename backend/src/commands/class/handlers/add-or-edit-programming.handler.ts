import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { AddOrEditProgrammingCommand } from '../add-or-edit-programming.command';
import { AddOrEditProgrammingResponseDto } from '../dto/add-or-edit-programming-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { ProgrammingRepository } from '../../../repositories/programming.repository';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ProgrammingEntity } from '../../../domain/programming/entities/programming.entity';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import { v4 as uuid } from 'uuid';

/**
 * AddOrEditProgrammingHandler: Orchestrates programming creation/update
 *
 * Responsibilities:
 * - Enforce all preconditions (coach assigned to class, class in publishable state)
 * - Create or update ProgrammingEntity with content
 * - Optionally update Class.loggable if provided
 * - Persist both entities
 * - Return programming details
 *
 * USER_JOURNEYS reference: Coach Journey Step 2
 */
@CommandHandler(AddOrEditProgrammingCommand)
export class AddOrEditProgrammingHandler implements ICommandHandler<AddOrEditProgrammingCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(ProgrammingRepository)
    private readonly programmingRepository: ProgrammingRepository,
    @Inject(GymStaffService)
    private readonly gymStaffService: GymStaffService,
  ) {}

  async execute(
    command: AddOrEditProgrammingCommand,
  ): Promise<AddOrEditProgrammingResponseDto> {
    // Precondition 1: Verify class exists and belongs to the gym in the route
    const classEntity = await this.classRepository.getClassById(
      command.classId,
      command.gymId,
    );
    if (!classEntity) {
      throw notFound('Class not found');
    }

    // Ownership guard: class must belong to the gym supplied in the command
    if (classEntity.gymId !== command.gymId) {
      throw forbidden('Class does not belong to the specified gym');
    }

    // Precondition 2: Verify coach is assigned to the class
    if (classEntity.coachUserId !== command.userId) {
      throw forbidden('Coach is not assigned to this class');
    }

    // Verify coach is active in the gym
    const isCoachActive = await this.gymStaffService.isCoachAssignedToClass(
      command.userId,
      command.classId,
      classEntity.gymId,
    );
    if (!isCoachActive) {
      throw forbidden('Coach is not active for this gym');
    }

    // Precondition 3: Verify class is in publishable state (published or booking_closed)
    if (
      classEntity.state !== 'published' &&
      classEntity.state !== 'booking_closed'
    ) {
      throw invalidState('Programming can only be added/edited while class is published or booking closed');
    }

    // State Change: Update class loggable flag if provided
    if (command.loggable !== undefined) {
      classEntity.loggable = command.loggable;
      classEntity.lastModifiedAt = new Date();
      await this.classRepository.save(classEntity);
    }

    // State Change: Create or update programming entity
    const now = new Date();
    let programming = await this.programmingRepository.getProgrammingByClassId(
      command.classId,
    );

    if (!programming) {
      // Create new programming
      programming = new ProgrammingEntity();
      programming.id = uuid();
      programming.classId = command.classId;
      programming.content = command.content;
      programming.createdByUserId = command.userId;
      programming.createdAt = now;
      programming.lastModifiedAt = now;
      programming.lastModifiedByUserId = null;
    } else {
      // Update existing programming
      programming.content = command.content;
      programming.lastModifiedAt = now;
      programming.lastModifiedByUserId = command.userId;
    }

    // Persist via repository
    const savedProgramming = await this.programmingRepository.save(programming);

    // Map to response DTO
    return this.mapToResponseDto(savedProgramming);
  }

  private mapToResponseDto(
    programmingEntity: ProgrammingEntity,
  ): AddOrEditProgrammingResponseDto {
    return {
      id: programmingEntity.id,
      classId: programmingEntity.classId,
      content: programmingEntity.content,
      createdByUserId: programmingEntity.createdByUserId,
      createdAt: programmingEntity.createdAt,
      lastModifiedAt: programmingEntity.lastModifiedAt,
      lastModifiedByUserId: programmingEntity.lastModifiedByUserId,
    };
  }
}
