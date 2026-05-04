import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { BookClassCommand } from '../book-class.command';
import { BookClassResponseDto } from '../dto/book-class-response.dto';
import { ClassRepository } from '../../../repositories/class.repository';
import { GymMembershipRepository } from '../../../repositories/gym-membership.repository';
import { AthleteMembershipPlanRepository } from '../../../repositories/athlete-membership-plan.repository';
import { GymService } from '../../../domain/gym/gym.service';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
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
  ) {}

  async execute(command: BookClassCommand): Promise<BookClassResponseDto> {
    // Precondition 1: Verify gym exists and is active
    const gym = await this.gymService.getGymById(command.gymId);
    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
    if (gym.status !== 'active') {
      throw new ForbiddenException('Gym is suspended');
    }

    // Precondition 2: Verify class exists, is in published state, and belongs to the gym
    const classEntity = await this.classRepository.getClassById(
      command.classId,
    );
    if (!classEntity) {
      throw new NotFoundException('Class not found');
    }
    if (classEntity.state !== 'published') {
      throw new BadRequestException(
        'Class is not available for booking (not in published state)',
      );
    }
    if (classEntity.gymId !== command.gymId) {
      throw new BadRequestException('Class does not belong to this gym');
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
        throw new ForbiddenException(
          'Athlete does not have an active membership in this gym',
        );
      }

      // Precondition 4: Verify athlete has active AthleteMembershipPlan for this gym
      const activePlan =
        await this.athleteMembershipPlanRepository.getActivePlanByGymMembership(
          gymMembership.id,
        );
      if (!activePlan) {
        throw new ForbiddenException(
          'Athlete does not have an active membership plan for this gym',
        );
      }

      // Precondition 5: Verify the plan's class_types includes this class's class_type_id
      const plan = activePlan.membershipPlan;
      if (!plan.classTypes.includes(classEntity.classTypeId)) {
        throw new ForbiddenException(
          'Athlete membership plan does not include this class type',
        );
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

    // Map to response DTO
    return this.mapToResponseDto(savedBooking);
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
