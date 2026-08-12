import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateClassCommand } from '../create-class.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { CreateClassResponseDto } from '../dto/create-class-response.dto';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import {
  toCalendarDay,
  toPersistedCalendarDay,
} from '../../../domain/shared/calendar-day';
import { v4 as uuid } from 'uuid';

/**
 * CreateClassHandler: Orchestrates class creation
 *
 * Responsibilities:
 * - Enforce all 8 preconditions from COMMAND_MODEL.md
 * - Create ClassEntity with proper initial state
 * - Decide timestamps, UUID, initial state
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: lines 1092-1140
 */
@CommandHandler(CreateClassCommand)
export class CreateClassHandler implements ICommandHandler<CreateClassCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(GymService) private readonly gymService: GymService,
    @Inject(GymStaffService) private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService) private readonly spaceService: SpaceService,
    @Inject(ClassTypeService)
    private readonly classTypeService: ClassTypeService,
  ) {}

  async execute(command: CreateClassCommand): Promise<CreateClassResponseDto> {
    // Precondition 1: Verify user is gym owner
    const isOwner = await this.gymStaffService.isGymOwner(
      command.userId,
      command.gymId,
    );
    if (!isOwner) {
      throw forbidden('User is not a gym owner for this gym');
    }

    // Precondition 2: Verify gym exists and is active
    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw notFound('Gym not found');
    }
    if (gym.status !== 'active') {
      throw invalidState('Gym is not active');
    }

    // Precondition 3: Verify class type exists and belongs to gym
    const classType = await this.classTypeService.getClassTypeById(
      command.classTypeId,
    );
    if (!classType) {
      throw notFound('ClassType not found');
    }
    if (classType.gymId !== command.gymId) {
      throw invalidState('ClassType does not belong to this gym');
    }

    // Precondition 4: Verify coach is active GymStaff with role = coach
    const coachStaff = await this.gymStaffService.getGymStaffByUserAndGym(
      command.coachUserId,
      command.gymId,
    );
    if (!coachStaff) {
      throw notFound('Coach is not assigned to this gym');
    }
    if (coachStaff.role !== 'coach' && coachStaff.role !== 'owner') {
      throw invalidState('Staff member cannot be assigned as a coach');
    }
    if (coachStaff.status !== 'active') {
      throw invalidState('Coach is not active');
    }

    // Precondition 5: Verify space exists and belongs to gym
    const space = await this.spaceService.getSpaceById(command.spaceId);
    if (!space) {
      throw notFound('Space not found');
    }
    if (space.gymId !== command.gymId) {
      throw invalidState('Space does not belong to this gym');
    }

    // Precondition 6: Verify scheduled_date + scheduled_time is in the future
    const scheduledDateTime = this.parseScheduledDateTime(
      command.scheduledDate,
      command.scheduledTime,
    );
    const now = new Date();
    if (scheduledDateTime <= now) {
      throw invalidState('Scheduled date/time must be in the future');
    }

    // Precondition 7: Determine capacity (use provided or default to space.base_capacity)
    const capacity = command.capacity ?? space.baseCapacity;
    if (capacity <= 0) {
      throw invalidState('Capacity must be greater than 0');
    }

    // State Change: Create ClassEntity with initial state = published
    // Handler owns: UUID generation, timestamp assignment, initial state decision
    const classEntity = new ClassEntity();
    classEntity.id = uuid();
    classEntity.gymId = command.gymId;
    classEntity.classTypeId = command.classTypeId;
    classEntity.coachUserId = command.coachUserId;
    classEntity.spaceId = command.spaceId;
    classEntity.scheduledDate = toPersistedCalendarDay(command.scheduledDate);
    classEntity.scheduledTime = command.scheduledTime;
    classEntity.capacity = capacity;
    classEntity.state = 'published'; // ← Initial state decided here
    classEntity.duration = command.duration ?? 60;
    classEntity.createdAt = now;
    classEntity.lastModifiedAt = now;
    classEntity.deletedAt = null;

    // Persist via repository (repository does NOT decide entity state)
    const savedClass = await this.classRepository.save(classEntity);

    // Map to response DTO
    return this.mapToResponseDto(savedClass);
  }

  /**
   * Combine a bare 'YYYY-MM-DD' calendar day with an HH:mm time into the instant
   * that class starts, on the SERVER-LOCAL calendar. An ISO datetime with no
   * trailing `Z` is parsed as local time, which is what the day and the wall-clock
   * time both mean. Going via `new Date(day)` instead would land on UTC midnight
   * and put the whole check on the previous day west of UTC.
   */
  private parseScheduledDateTime(day: string, time: string): Date {
    const timeStr = time.length === 5 ? `${time}:00` : time;
    return new Date(`${day}T${timeStr}`);
  }

  private mapToResponseDto(classEntity: ClassEntity): CreateClassResponseDto {
    return {
      id: classEntity.id,
      gymId: classEntity.gymId,
      classTypeId: classEntity.classTypeId,
      coachUserId: classEntity.coachUserId,
      spaceId: classEntity.spaceId,
      // CreateClassResponseDto declares this `Date` where every other endpoint
      // returns 'YYYY-MM-DD', so the stored calendar day is re-inflated to the
      // UTC-midnight instant this endpoint has always returned. Narrowing the DTO
      // to a string is a Swagger + generated-types change, tracked separately.
      scheduledDate: new Date(
        `${toCalendarDay(classEntity.scheduledDate)}T00:00:00.000Z`,
      ),
      scheduledTime: classEntity.scheduledTime,
      capacity: classEntity.capacity,
      duration: classEntity.duration,
      state: classEntity.state,
      createdAt: classEntity.createdAt,
      lastModifiedAt: classEntity.lastModifiedAt,
    };
  }
}
