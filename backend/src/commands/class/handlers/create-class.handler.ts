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
    classEntity.scheduledDate = this.toDate(command.scheduledDate);
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

  private parseScheduledDateTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private toDate(input: Date | string): Date {
    if (input instanceof Date) {
      return input;
    }
    return new Date(input);
  }

  private mapToResponseDto(classEntity: ClassEntity): CreateClassResponseDto {
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
      state: classEntity.state,
      createdAt: classEntity.createdAt,
      lastModifiedAt: classEntity.lastModifiedAt,
    };
  }
}
