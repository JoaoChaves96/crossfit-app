import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ToggleLoggableStatusCommand } from '../toggle-loggable-status.command';
import { ToggleLoggableStatusResponseDto } from '../dto/toggle-loggable-status-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { Inject } from '@nestjs/common';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';

/**
 * ToggleLoggableStatusHandler: Orchestrates class loggable status toggle
 *
 * Responsibilities:
 * - Enforce preconditions (coach assigned to class)
 * - Toggle the loggable flag on the class
 * - Update lastModifiedAt timestamp
 * - Persist via repository
 * - Return updated class state
 *
 * USER_JOURNEYS reference: Coach Journey Step 2
 */
@CommandHandler(ToggleLoggableStatusCommand)
export class ToggleLoggableStatusHandler implements ICommandHandler<ToggleLoggableStatusCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(GymStaffService)
    private readonly gymStaffService: GymStaffService,
  ) {}

  async execute(
    command: ToggleLoggableStatusCommand,
  ): Promise<ToggleLoggableStatusResponseDto> {
    // Precondition 1: Verify class exists
    const classEntity = await this.classRepository.getClassById(
      command.classId,
    );
    if (!classEntity) {
      throw notFound('Class not found');
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

    // Precondition 3: Verify class is in editable state (published or booking_closed)
    if (
      classEntity.state !== 'published' &&
      classEntity.state !== 'booking_closed'
    ) {
      throw invalidState('Loggable status can only be toggled while class is published or booking closed');
    }

    // State Change: Toggle the loggable flag
    classEntity.loggable = !classEntity.loggable;
    classEntity.lastModifiedAt = new Date();

    // Persist via repository
    const savedClass = await this.classRepository.save(classEntity);

    // Map to response DTO
    return this.mapToResponseDto(savedClass);
  }

  private mapToResponseDto(
    classEntity: ClassEntity,
  ): ToggleLoggableStatusResponseDto {
    return {
      id: classEntity.id,
      gymId: classEntity.gymId,
      classTypeId: classEntity.classTypeId,
      coachUserId: classEntity.coachUserId,
      spaceId: classEntity.spaceId,
      scheduledDate: classEntity.scheduledDate,
      scheduledTime: classEntity.scheduledTime,
      capacity: classEntity.capacity,
      loggable: classEntity.loggable,
      state: classEntity.state,
      createdAt: classEntity.createdAt,
      lastModifiedAt: classEntity.lastModifiedAt,
    };
  }
}
