import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EditClassCommand } from '../edit-class.command';
import { EditClassResponseDto } from '../dto/edit-class-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { ClassModifiedEvent } from '../../../domain/notification/events/class-modified.event';
import { notFound, invalidState } from '../../../http/exceptions';
import {
  toCalendarDay,
  toPersistedCalendarDay,
} from '../../../domain/shared/calendar-day';

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: EditClassCommand): Promise<EditClassResponseDto> {
    const cls = await this.classRepository.getClassById(
      command.classId,
      command.gymId,
    );

    if (!cls) {
      throw notFound(
        `Class ${command.classId} not found in gym ${command.gymId}`,
      );
    }

    if (cls.state !== 'published') {
      throw invalidState('Only published classes can be edited');
    }

    // Captured before the patch is applied: a booked athlete is only notified
    // when one of these three actually moves.
    const before = {
      scheduledDate: toCalendarDay(cls.scheduledDate),
      scheduledTime: cls.scheduledTime,
      spaceId: cls.spaceId,
    };

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
      if (coachStaff.role !== 'coach' && coachStaff.role !== 'owner') {
        throw invalidState('Staff member cannot be assigned as a coach');
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
      cls.scheduledDate = toPersistedCalendarDay(command.scheduledDate);
    }

    if (command.scheduledTime !== undefined) {
      cls.scheduledTime = command.scheduledTime;
    }

    if (command.duration !== undefined) {
      cls.duration = command.duration;
    }

    const rescheduled =
      toCalendarDay(cls.scheduledDate) !== before.scheduledDate ||
      cls.scheduledTime !== before.scheduledTime;
    const relocated = cls.spaceId !== before.spaceId;

    if (rescheduled) {
      // The old start time was already reminded about; the new one has not been.
      cls.reminderSentAt = null;
    }

    cls.lastModifiedAt = new Date();

    const saved = await this.classRepository.save(cls);

    const bookedCount = await this.bookingRepository.countBookedBookings(
      saved.id,
    );

    await this.notifyBookedAthletes(saved, { rescheduled, relocated });

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

  /**
   * Emits `class.modified` when a material field moved — the date, the time or
   * the space. A coach or capacity edit changes nothing an athlete has to act
   * on, so it stays silent (epics/NOTIFICATIONS_EPIC.md).
   */
  private async notifyBookedAthletes(
    saved: ClassEntity,
    { rescheduled, relocated }: { rescheduled: boolean; relocated: boolean },
  ): Promise<void> {
    if (!rescheduled && !relocated) {
      return;
    }

    const changes: string[] = [];
    if (rescheduled) {
      changes.push(
        `moved to ${this.formatDate(saved.scheduledDate)} at ${saved.scheduledTime}`,
      );
    }
    if (relocated) {
      changes.push('location changed');
    }

    const bookedUserIds = (
      await this.bookingRepository.getBookedBookingsByClass(saved.id)
    ).map((booking) => booking.userId);

    if (bookedUserIds.length === 0) {
      return;
    }

    this.eventEmitter.emit(
      'class.modified',
      new ClassModifiedEvent(
        saved.gymId,
        saved.id,
        saved.classType?.name || 'Class',
        changes.join(', '),
        bookedUserIds,
      ),
    );
  }

  /**
   * `saved.scheduledDate` is a bare 'YYYY-MM-DD' string whenever the command did
   * not change it (the `date` column hydrates as a string), so it must not be
   * re-parsed as an instant. See toCalendarDay.
   */
  private formatDate(date: Date | string): string {
    return toCalendarDay(date);
  }
}
