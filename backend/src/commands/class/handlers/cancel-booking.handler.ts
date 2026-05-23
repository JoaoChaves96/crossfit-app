import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelBookingCommand } from '../cancel-booking.command';
import { CancelBookingResponseDto } from '../dto/cancel-booking-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';
import { WaitlistPromotedEvent } from '../../../domain/notification/events/waitlist-promoted.event';
import { ConflictException } from '@nestjs/common';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ClassEntity } from '../../../domain/class/entities/class.entity';

/**
 * CancelBookingHandler: Orchestrates booking cancellation
 *
 * Responsibilities:
 * - Enforce all 4 preconditions from COMMAND_MODEL.md lines 287-292
 * - Cancel the booking (set status = cancelled, cancelled_at = now)
 * - Automatically promote first waitlisted athlete if booking was booked
 * - Renumber remaining waitlist positions
 *
 * COMMAND_MODEL.md reference: lines 276-310
 * PromoteWaitlist logic: lines 313-345
 */
@CommandHandler(CancelBookingCommand)
export class CancelBookingHandler implements ICommandHandler<CancelBookingCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(BookingRepository)
    private readonly bookingRepository: BookingRepository,
    @InjectRepository(BookingEntity)
    private readonly bookingDbRepository: Repository<BookingEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CancelBookingCommand,
  ): Promise<CancelBookingResponseDto> {
    // Precondition 1: Verify booking exists and belongs to the athlete
    const booking = await this.bookingRepository.getBookingById(
      command.bookingId,
    );
    if (!booking) {
      throw notFound('Booking not found');
    }
    if (booking.userId !== command.userId) {
      throw forbidden('Booking does not belong to this athlete');
    }

    // Precondition 2: Verify booking status is booked or waitlisted
    if (booking.status === 'cancelled') {
      throw new ConflictException('Booking is already cancelled');
    }
    if (booking.status !== 'booked' && booking.status !== 'waitlisted') {
      throw new ConflictException(
        'Booking cannot be cancelled in its current state',
      );
    }

    // Precondition 3: Verify class exists and is in published state
    const classEntity = await this.classRepository.getClassById(
      booking.classId,
    );
    if (!classEntity) {
      throw notFound('Class not found');
    }
    if (classEntity.gymId !== command.gymId) {
      throw forbidden('Class does not belong to the expected gym');
    }
    if (classEntity.state !== 'published') {
      throw invalidState('Cancellations are only allowed while the class is in published state');
    }

    // Precondition 4: Verify booking hasn't already been cancelled
    // (This is redundant with precondition 2, but explicit per spec)
    if (booking.cancelledAt !== null) {
      throw new ConflictException('Booking is already cancelled');
    }

    // State Change: Cancel the booking
    const wasBoolked = booking.status === 'booked';
    booking.status = 'cancelled';
    booking.cancelledAt = new Date();

    // Save the cancellation
    await this.bookingRepository.save(booking);

    // State Change: If booking was booked and waitlisted athletes exist, promote first
    if (wasBoolked) {
      await this.promoteFirstWaitlistedBooking(booking.classId, classEntity);
    }

    // Map to response DTO
    return this.mapToResponseDto(booking);
  }

  /**
   * PromoteWaitlist (internal/automatic)
   *
   * Per COMMAND_MODEL.md lines 313-345:
   * - Find first waitlisted athlete (by booked_position)
   * - Set status = booked, booked_position = null
   * - Renumber remaining waitlist positions
   */
  private async promoteFirstWaitlistedBooking(
    classId: string,
    classEntity: ClassEntity,
  ): Promise<void> {
    // Precondition: At least one waitlisted booking exists
    const firstWaitlisted =
      await this.bookingRepository.getFirstWaitlistedBooking(classId);
    if (!firstWaitlisted) {
      // No waitlisted athletes; nothing to promote
      return;
    }

    // State Change: Promote first waitlisted to booked
    firstWaitlisted.status = 'booked';
    firstWaitlisted.bookedPosition = null;
    await this.bookingRepository.save(firstWaitlisted);

    // Emit domain event for waitlist promotion
    this.eventEmitter.emit(
      'waitlist.promoted',
      new WaitlistPromotedEvent(
        firstWaitlisted.userId,
        classEntity.gymId,
        classId,
        classEntity.classType?.name || 'Class',
        classEntity.scheduledDate instanceof Date
          ? classEntity.scheduledDate.toISOString().slice(0, 10)
          : String(classEntity.scheduledDate).slice(0, 10),
        classEntity.scheduledTime,
      ),
    );

    // State Change: Renumber remaining waitlist positions
    const remainingWaitlisted =
      await this.bookingRepository.getWaitlistedBookingsByClass(classId);

    // Renumber positions: shift all positions down by 1
    for (let i = 0; i < remainingWaitlisted.length; i++) {
      remainingWaitlisted[i].bookedPosition = i + 1;
    }

    // Save all renumbered bookings
    if (remainingWaitlisted.length > 0) {
      await this.bookingDbRepository.save(remainingWaitlisted);
    }
  }

  private mapToResponseDto(booking: BookingEntity): CancelBookingResponseDto {
    return {
      id: booking.id,
      classId: booking.classId,
      userId: booking.userId,
      status: booking.status,
      bookedPosition: booking.bookedPosition,
      createdAt: booking.createdAt,
      cancelledAt: booking.cancelledAt,
    };
  }
}
