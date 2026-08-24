import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteClassCommand } from '../delete-class.command';
import { DeleteClassResponseDto } from '../dto/delete-class-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { ClassCancelledEvent } from '../../../domain/notification/events/class-cancelled.event';
import { toCalendarDay } from '../../../domain/shared/calendar-day';
import { notFound, invalidState } from '../../../http/exceptions';

@CommandHandler(DeleteClassCommand)
export class DeleteClassHandler implements ICommandHandler<DeleteClassCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(BookingRepository)
    private readonly bookingRepository: BookingRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteClassCommand): Promise<DeleteClassResponseDto> {
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
      throw invalidState('Only published classes can be deleted');
    }

    const deletedAt = new Date();
    cls.deletedAt = deletedAt;
    cls.lastModifiedAt = deletedAt;

    await this.classRepository.save(cls);

    // Booked athletes lose their seat, so they are told the class is gone.
    const bookedUserIds = (
      await this.bookingRepository.getBookedBookingsByClass(cls.id)
    ).map((booking) => booking.userId);

    if (bookedUserIds.length > 0) {
      this.eventEmitter.emit(
        'class.cancelled',
        new ClassCancelledEvent(
          cls.gymId,
          cls.id,
          cls.classType?.name || 'Class',
          toCalendarDay(cls.scheduledDate),
          cls.scheduledTime,
          bookedUserIds,
        ),
      );
    }

    return {
      id: cls.id,
      deletedAt,
    };
  }
}
