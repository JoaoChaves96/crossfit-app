import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ToggleLoggableStatusCommand } from '../toggle-loggable-status.command';
import { ToggleLoggableStatusResponseDto } from '../dto/toggle-loggable-status-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { ClassContentAccessService } from '../../../domain/class/class-content-access.service';
import { Inject } from '@nestjs/common';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';

/**
 * ToggleLoggableStatusHandler: Orchestrates class loggable status toggle
 *
 * Responsibilities:
 * - Enforce preconditions (gym owner or assigned coach, class in editable state)
 * - Toggle the loggable flag on the class
 * - Update lastModifiedAt timestamp
 * - Persist via repository
 * - Return updated class state
 *
 * USER_JOURNEYS reference: Coach Journey Step 2
 * DECISIONS reference: Programming Authorship (owner or assigned coach)
 */
@CommandHandler(ToggleLoggableStatusCommand)
export class ToggleLoggableStatusHandler implements ICommandHandler<ToggleLoggableStatusCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(ClassContentAccessService)
    private readonly classContentAccessService: ClassContentAccessService,
  ) {}

  async execute(
    command: ToggleLoggableStatusCommand,
  ): Promise<ToggleLoggableStatusResponseDto> {
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

    // Precondition 2: Caller must be the gym owner or the assigned, active coach
    await this.classContentAccessService.assertCanEditClassContent(
      command.userId,
      classEntity,
    );

    // Precondition 3: Verify class is in editable state (published or booking_closed)
    if (
      classEntity.state !== 'published' &&
      classEntity.state !== 'booking_closed'
    ) {
      throw invalidState(
        'Loggable status can only be toggled while class is published or booking closed',
      );
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
