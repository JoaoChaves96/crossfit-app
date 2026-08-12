import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookClassCommand } from '../book-class.command';
import { BookClassResponseDto } from '../dto/book-class-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { GymMembershipRepository } from '../../../repositories/gym-membership.repository';
import { AthleteMembershipPlanRepository } from '../../../repositories/athlete-membership-plan.repository';
import { GymService } from '../../../domain/gym/gym.service';
import { effectiveExpiresAt } from '../../../domain/athlete-membership-plan/billing-cycle';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';
import { BookingCreatedEvent } from '../../../domain/notification/events/booking-created.event';
import { ConflictException } from '@nestjs/common';
import { notFound, forbidden, invalidState } from '../../../http/exceptions';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { v4 as uuid } from 'uuid';

/**
 * BookClassHandler: Orchestrates class booking
 *
 * Responsibilities:
 * - Enforce all 7 preconditions from COMMAND_MODEL.md lines 240-248
 * - Determine booking status (booked vs waitlisted) based on available capacity
 * - Create BookingEntity with proper initial state
 * - Persist via repository
 *
 * COMMAND_MODEL.md reference: lines 228-272
 */
@CommandHandler(BookClassCommand)
export class BookClassHandler implements ICommandHandler<BookClassCommand> {
  constructor(
    @Inject(ClassRepository) private readonly classRepository: ClassRepository,
    @Inject(GymMembershipRepository)
    private readonly gymMembershipRepository: GymMembershipRepository,
    @Inject(AthleteMembershipPlanRepository)
    private readonly athleteMembershipPlanRepository: AthleteMembershipPlanRepository,
    @Inject(GymService) private readonly gymService: GymService,
    @InjectRepository(BookingEntity)
    private readonly bookingRepository: Repository<BookingEntity>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: BookClassCommand): Promise<BookClassResponseDto> {
    // Precondition 1: Verify gym exists and is active
    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw notFound('Gym not found');
    }
    if (gym.status !== 'active') {
      throw forbidden('Gym is suspended');
    }

    // Precondition 2: Verify class exists, is in published state, and belongs to the gym
    const classEntity = await this.classRepository.getClassById(
      command.classId,
    );
    if (!classEntity) {
      throw notFound('Class not found');
    }
    if (classEntity.state !== 'published') {
      throw invalidState('Class is not available for booking (not in published state)');
    }
    if (classEntity.gymId !== command.gymId) {
      throw invalidState('Class does not belong to this gym');
    }

    // Preconditions 3–5: Membership and plan checks — skipped for gym owners and coaches
    // Staff are trusted members of their own gym and do not require a GymMembership record
    const isStaff =
      command.userRole === 'owner' || command.userRole === 'coach';

    if (!isStaff) {
      // Precondition 3: Verify athlete has active GymMembership for this gym
      const gymMembership =
        await this.gymMembershipRepository.getActiveGymMembershipByUserAndGym(
          command.userId,
          command.gymId,
        );
      if (!gymMembership) {
        throw forbidden('Athlete does not have an active membership in this gym');
      }

      // Precondition 4: Verify athlete has active AthleteMembershipPlan for this gym
      const activePlan =
        await this.athleteMembershipPlanRepository.getActivePlanByGymMembership(
          gymMembership.id,
        );
      if (!activePlan) {
        throw forbidden('Athlete does not have an active membership plan for this gym');
      }

      // Precondition 5: Verify the plan's class_types includes this class's class_type_id
      const plan = activePlan.membershipPlan;
      if (!plan.classTypes.includes(classEntity.classTypeId)) {
        throw forbidden('Athlete membership plan does not include this class type');
      }

      // Precondition 5b: the plan must not have lapsed. The row can still read
      // 'active' between MembershipRenewalScheduler ticks, so check the date.
      // A null expiresAt means unlimited: never expired, never a cutoff.
      //
      // The staleness cuts both ways, so the expiry is DERIVED rather than read:
      // an auto-roll plan whose stored expiry has passed but which the hourly
      // scheduler has not reached yet is still covered through its next cycle,
      // and a fully-paid auto-renewing member must not lose booking for the
      // rest of the hour. Derivation only — booking never writes the rolled date.
      const now = new Date();
      const planExpiresAt = effectiveExpiresAt(
        {
          expiresAt:
            activePlan.expiresAt != null
              ? new Date(activePlan.expiresAt)
              : null,
          autoRoll: activePlan.autoRoll,
          billingCycle: plan.billingCycle,
        },
        now,
      );

      if (planExpiresAt && planExpiresAt.getTime() <= now.getTime()) {
        throw forbidden('Athlete membership plan has expired');
      }

      // Precondition 5c: the class must fall within the plan's coverage.
      // Compared date-to-date so a class on the expiry day is still bookable;
      // 5b above is instant-granular, and the stricter of the two governs.
      if (planExpiresAt) {
        const classDay = this.toDayString(classEntity.scheduledDate);
        const cutoffDay = this.toDayString(planExpiresAt);

        if (classDay > cutoffDay) {
          throw forbidden(
            'Class is scheduled after the athlete membership plan expires',
          );
        }
      }
    }

    // Precondition 6: Verify user does not already have an active booking for this class
    const existingBooking = await this.bookingRepository.findOne({
      where: {
        classId: command.classId,
        userId: command.userId,
      },
    });
    if (existingBooking && existingBooking.status !== 'cancelled') {
      throw new ConflictException(
        'Athlete already has a booking for this class',
      );
    }

    // State Change: Determine available capacity
    // Available capacity = class.capacity - (count of booked bookings)
    const bookedCount = await this.bookingRepository.count({
      where: {
        classId: command.classId,
        status: 'booked',
      },
    });
    const availableCapacity = classEntity.capacity - bookedCount;

    // State Change: Create BookingEntity with status = booked or waitlisted
    const booking = new BookingEntity();
    booking.id = uuid();
    booking.classId = command.classId;
    booking.userId = command.userId;
    booking.createdAt = new Date();
    booking.cancelledAt = null;

    if (availableCapacity > 0) {
      // Capacity available: create booked booking
      booking.status = 'booked';
      booking.bookedPosition = null;
    } else {
      // At capacity: create waitlisted booking
      // Determine next waitlist position
      const waitlistedCount = await this.bookingRepository.count({
        where: {
          classId: command.classId,
          status: 'waitlisted',
        },
      });
      booking.status = 'waitlisted';
      booking.bookedPosition = waitlistedCount + 1;
    }

    // Persist via repository
    const savedBooking = await this.bookingRepository.save(booking);

    // Emit domain event for confirmed bookings (not waitlisted)
    if (savedBooking.status === 'booked') {
      this.eventEmitter.emit(
        'booking.created',
        new BookingCreatedEvent(
          command.userId,
          command.gymId,
          command.classId,
          classEntity.classType?.name || 'Class',
          classEntity.scheduledDate instanceof Date
            ? classEntity.scheduledDate.toISOString().slice(0, 10)
            : String(classEntity.scheduledDate).slice(0, 10),
          classEntity.scheduledTime,
        ),
      );
    }

    // Map to response DTO
    return this.mapToResponseDto(savedBooking);
  }

  /**
   * Reduce a date value to YYYY-MM-DD on the server-local calendar so plan
   * coverage is compared by day rather than by instant. Local (not UTC) to match
   * the expiresAt-vs-now comparison in MembershipRenewalScheduler and the dates
   * the athlete schedule renders.
   */
  private toDayString(value: Date | string | number): string {
    const date = value instanceof Date ? value : new Date(value);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private mapToResponseDto(booking: BookingEntity): BookClassResponseDto {
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
