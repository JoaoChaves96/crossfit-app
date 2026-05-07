import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ManuallyTransitionClassStateCommand } from '../manually-transition-class-state.command';
import { ManuallyTransitionClassStateResponseDto } from '../dto/manually-transition-class-state-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';

/**
 * ManuallyTransitionClassStateHandler: Orchestrates class state transitions
 *
 * Responsibilities:
 * - Enforce preconditions (coach assigned to class)
 * - Validate target state is next valid state (unidirectional progression)
 * - Update class state and timestamp
 * - Persist via repository
 * - Return updated class state
 *
 * USER_JOURNEYS reference: Coach Journey Step 4
 * DATA_MODEL reference: Class Lifecycle section
 */
@CommandHandler(ManuallyTransitionClassStateCommand)
export class ManuallyTransitionClassStateHandler implements ICommandHandler<ManuallyTransitionClassStateCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(GymStaffService)
    private readonly gymStaffService: GymStaffService,
  ) {}

  async execute(
    command: ManuallyTransitionClassStateCommand,
  ): Promise<ManuallyTransitionClassStateResponseDto> {
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

    // Precondition 3: Verify target state is valid progression (unidirectional)
    this.validateStateTransition(classEntity.state, command.targetState);

    // State Change: Update class state
    classEntity.state = command.targetState;
    classEntity.lastModifiedAt = new Date();

    // Persist via repository
    const savedClass = await this.classRepository.save(classEntity);

    // Map to response DTO
    return this.mapToResponseDto(savedClass);
  }

  /**
   * Validate that the state transition follows the unidirectional state machine:
   * published → booking_closed → in_progress → completed → archived
   */
  private validateStateTransition(
    currentState:
      | 'published'
      | 'booking_closed'
      | 'in_progress'
      | 'completed'
      | 'archived',
    targetState:
      | 'published'
      | 'booking_closed'
      | 'in_progress'
      | 'completed'
      | 'archived',
  ): void {
    const stateSequence = [
      'published',
      'booking_closed',
      'in_progress',
      'completed',
      'archived',
    ];

    const currentIndex = stateSequence.indexOf(currentState);
    const targetIndex = stateSequence.indexOf(targetState);

    // Target must be exactly the next state in sequence
    if (targetIndex !== currentIndex + 1) {
      throw invalidState(
        `Cannot transition from ${currentState} to ${targetState}. Classes must follow state progression: published → booking_closed → in_progress → completed → archived`,
      );
    }
  }

  private mapToResponseDto(
    classEntity: ClassEntity,
  ): ManuallyTransitionClassStateResponseDto {
    return {
      id: classEntity.id,
      gymId: classEntity.gymId,
      classTypeId: classEntity.classTypeId,
      coachUserId: classEntity.coachUserId,
      spaceId: classEntity.spaceId,
      scheduledDate: classEntity.scheduledDate,
      scheduledTime: classEntity.scheduledTime,
      capacity: classEntity.capacity,
      duration: classEntity.duration,
      loggable: classEntity.loggable,
      state: classEntity.state,
      createdAt: classEntity.createdAt,
      lastModifiedAt: classEntity.lastModifiedAt,
    };
  }
}
