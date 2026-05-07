import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EditClassCommand } from '../edit-class.command';
import { EditClassResponseDto } from '../dto/edit-class-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { notFound, invalidState } from '../../../http/exceptions';

@CommandHandler(EditClassCommand)
export class EditClassHandler implements ICommandHandler<EditClassCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(BookingRepository)
    private readonly bookingRepository: BookingRepository,
    @Inject(ClassTypeService)
    private readonly classTypeService: ClassTypeService,
    @Inject(GymStaffService)
    private readonly gymStaffService: GymStaffService,
    @Inject(SpaceService) private readonly spaceService: SpaceService,
  ) {}

  async execute(command: EditClassCommand): Promise<EditClassResponseDto> {
    const cls = await this.classRepository.getClassById(
      command.classId,
      command.gymId,
    );

    if (!cls) {
      throw notFound(`Class ${command.classId} not found in gym ${command.gymId}`);
    }

    if (cls.state !== 'published') {
      throw invalidState('Only published classes can be edited');
    }

    if (command.classTypeId !== undefined) {
      const classType = await this.classTypeService.getClassTypeById(
        command.classTypeId,
      );
      if (!classType) {
        throw notFound('ClassType not found');
      }
      if (classType.gymId !== command.gymId) {
        throw invalidState('ClassType does not belong to this gym');
      }
      cls.classTypeId = command.classTypeId;
    }

    if (command.coachUserId !== undefined) {
      const coachStaff = await this.gymStaffService.getGymStaffByUserAndGym(
        command.coachUserId,
        command.gymId,
      );
      if (!coachStaff) {
        throw notFound('Coach is not assigned to this gym');
      }
      if (coachStaff.role !== 'coach') {
        throw invalidState('Staff member is not a coach');
      }
      if (coachStaff.status !== 'active') {
        throw invalidState('Coach is not active');
      }
      cls.coachUserId = command.coachUserId;
    }

    if (command.spaceId !== undefined) {
      const space = await this.spaceService.getSpaceById(command.spaceId);
      if (!space) {
        throw notFound('Space not found');
      }
      if (space.gymId !== command.gymId) {
        throw invalidState('Space does not belong to this gym');
      }
      cls.spaceId = command.spaceId;
    }

    if (command.capacity !== undefined) {
      if (command.capacity < 1) {
        throw invalidState('Capacity must be at least 1');
      }
      const bookedCount = await this.bookingRepository.countBookedBookings(
        cls.id,
      );
      if (command.capacity < bookedCount) {
        throw invalidState(
          `Cannot reduce capacity to ${command.capacity}: ${bookedCount} athletes are already booked`,
        );
      }
      cls.capacity = command.capacity;
    }

    if (command.scheduledDate !== undefined) {
      cls.scheduledDate = command.scheduledDate;
    }

    if (command.scheduledTime !== undefined) {
      cls.scheduledTime = command.scheduledTime;
    }

    if (command.duration !== undefined) {
      cls.duration = command.duration;
    }

    cls.lastModifiedAt = new Date();

    const saved = await this.classRepository.save(cls);

    const bookedCount = await this.bookingRepository.countBookedBookings(
      saved.id,
    );

    return {
      id: saved.id,
      classTypeId: saved.classTypeId,
      classTypeName: saved.classType?.name || 'Unknown',
      scheduledDate: this.formatDate(saved.scheduledDate),
      scheduledTime: saved.scheduledTime,
      coachName: saved.coach?.name || 'Unknown Coach',
      spaceName: saved.space?.name || 'Unknown Space',
      capacity: saved.capacity,
      duration: saved.duration,
      bookedCount,
      state: saved.state,
    };
  }

  private formatDate(date: Date | string): string {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
