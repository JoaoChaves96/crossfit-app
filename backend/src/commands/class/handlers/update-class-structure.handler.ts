import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { UpdateClassStructureCommand } from '../update-class-structure.command';
import { UpdateClassStructureResponseDto } from '../dto/update-class-structure-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';

/**
 * UpdateClassStructureHandler: Orchestrates class capacity and space updates
 *
 * Responsibilities:
 * - Enforce preconditions (coach assigned, class in publishable state)
 * - Validate new capacity and space
 * - Check capacity reduction conflicts
 * - Update class structure and timestamp
 * - Persist via repository
 * - Return updated class state
 *
 * USER_JOURNEYS reference: Coach Journey Step 3
 * DATA_MODEL reference: Class entity
 */
@CommandHandler(UpdateClassStructureCommand)
export class UpdateClassStructureHandler implements ICommandHandler<UpdateClassStructureCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(BookingRepository)
    private readonly bookingRepository: BookingRepository,
    @Inject(GymStaffService)
    private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService)
    private readonly spaceService: SpaceService,
  ) {}

  async execute(
    command: UpdateClassStructureCommand,
  ): Promise<UpdateClassStructureResponseDto> {
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
      throw invalidState('Class structure can only be modified while class is published or booking closed');
    }

    // Validate and apply capacity update if provided
    if (command.capacity !== undefined) {
      await this.validateAndUpdateCapacity(classEntity, command.capacity);
    }

    // Validate and apply space update if provided
    if (command.spaceId !== undefined) {
      await this.validateAndUpdateSpace(classEntity, command.spaceId);
    }

    // Update timestamp
    classEntity.lastModifiedAt = new Date();

    // Persist via repository
    const savedClass = await this.classRepository.save(classEntity);

    // Map to response DTO
    return this.mapToResponseDto(savedClass);
  }

  /**
   * Validate new capacity and update class
   * Throws if capacity reduction creates a conflict (booked bookings > new capacity)
   */
  private async validateAndUpdateCapacity(
    classEntity: ClassEntity,
    newCapacity: number,
  ): Promise<void> {
    // Validate new capacity
    if (newCapacity <= 0) {
      throw invalidState('Capacity must be greater than 0');
    }

    // If reducing capacity, check for conflicts
    if (newCapacity < classEntity.capacity) {
      const bookedCount = await this.bookingRepository.countBookedBookings(
        classEntity.id,
      );
      if (bookedCount > newCapacity) {
        throw invalidState(
          `Cannot reduce capacity to ${newCapacity}: ${bookedCount} athletes are already booked. Capacity reduction would conflict with existing bookings.`,
        );
      }
    }

    classEntity.capacity = newCapacity;
  }

  /**
   * Validate new space and update class
   * Throws if space does not belong to the same gym
   */
  private async validateAndUpdateSpace(
    classEntity: ClassEntity,
    newSpaceId: string,
  ): Promise<void> {
    // Verify space exists and belongs to the same gym
    const space = await this.spaceService.getSpaceById(newSpaceId);
    if (!space) {
      throw notFound('Space not found');
    }
    if (space.gymId !== classEntity.gymId) {
      throw invalidState('Space does not belong to this gym');
    }

    classEntity.spaceId = newSpaceId;
  }

  private mapToResponseDto(
    classEntity: ClassEntity,
  ): UpdateClassStructureResponseDto {
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
