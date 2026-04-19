import { Injectable, ForbiddenException } from '@nestjs/common';
import { ClassRepository } from '../../repositories/class.repository';
import { BookingRepository } from '../../repositories/booking.repository';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { ClassScheduleItemDto } from './dto/class-schedule-item.dto';
import { GetClassScheduleResponseDto } from './dto/get-class-schedule-response.dto';

/**
 * ClassScheduleService: Query handler for athlete class schedules
 *
 * Enforces visibility rules per PRODUCT.md:
 * "Classes are only visible to an athlete if:
 *  1. Athlete belongs to the gym (has active GymMembership), AND
 *  2. Athlete's active membership plan grants access to the class type"
 *
 * This service:
 * - Validates athlete's gym membership and plan eligibility
 * - Filters classes by membership plan visibility
 * - Aggregates booking data (booked count)
 * - Returns only eligible, non-archived classes
 *
 * IMPORTANT: This is read-only. No state changes.
 */
@Injectable()
export class ClassScheduleService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly gymMembershipRepository: GymMembershipRepository,
    private readonly athleteMembershipPlanRepository: AthleteMembershipPlanRepository,
  ) {}

  /**
   * Get eligible classes for an athlete in a specific gym
   *
   * @param gymId - The gym to fetch classes from
   * @param athleteUserId - The athlete requesting the schedule
   * @returns Classes visible and bookable by the athlete
   * @throws ForbiddenException if athlete doesn't have active gym membership
   */
  async getClassScheduleForAthlete(
    gymId: string,
    athleteUserId: string,
  ): Promise<GetClassScheduleResponseDto> {
    // Step 1: Verify athlete has active gym membership in this gym
    const gymMembership =
      await this.gymMembershipRepository.getActiveGymMembershipByUserAndGym(
        athleteUserId,
        gymId,
      );

    if (!gymMembership) {
      throw new ForbiddenException(
        'Athlete does not have an active membership in this gym',
      );
    }

    // Step 2: Get athlete's active membership plan for this gym
    const activePlan =
      await this.athleteMembershipPlanRepository.getActivePlanByGymMembership(
        gymMembership.id,
      );

    if (!activePlan || !activePlan.membershipPlan) {
      throw new ForbiddenException(
        'Athlete does not have an active membership plan in this gym',
      );
    }

    // Step 3: Extract the list of class type IDs the athlete can access
    // MembershipPlan.classTypes is a simple-array column: string[]
    const allowedClassTypeIds = activePlan.membershipPlan.classTypes || [];

    // Step 4: Fetch all non-archived classes in the gym
    const allClasses = await this.classRepository.getClassesByGym(gymId);

    // Step 5: Filter classes to only include non-archived ones with matching class types
    // Classes in 'archived' state should not be shown
    const eligibleClasses = allClasses.filter(
      (cls) =>
        cls.state !== 'archived' &&
        allowedClassTypeIds.includes(cls.classTypeId),
    );

    // Step 6: Aggregate booking data and map to DTOs
    const classItems: ClassScheduleItemDto[] = await Promise.all(
      eligibleClasses.map(async (cls) => {
        // Count booked (confirmed) spots only
        const bookedCount = await this.bookingRepository.countBookedBookings(
          cls.id,
        );

        return {
          id: cls.id,
          classTypeId: cls.classTypeId,
          classTypeName: cls.classType?.name || 'Unknown',
          scheduledDate: this.formatDate(cls.scheduledDate),
          scheduledTime: cls.scheduledTime,
          coachName: cls.coach?.name || 'Unknown Coach',
          capacity: cls.capacity,
          bookedCount,
          state: cls.state,
        };
      }),
    );

    // Sort by scheduled date and time
    classItems.sort((a, b) => {
      const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCompare !== 0) return dateCompare;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    return {
      classes: classItems,
    };
  }

  /**
   * Format a date value to YYYY-MM-DD string.
   * Accepts Date, ISO string, or millisecond timestamp.
   * Normalizes the input to a Date instance before formatting.
   *
   * @param date - Date object, ISO string, or millisecond timestamp
   * @returns Formatted date string (YYYY-MM-DD)
   * @throws TypeError if the value cannot be converted to a Date
   */
  private formatDate(date: Date | string | number): string {
    // Normalize input to a Date instance
    let dateInstance: Date;

    if (date instanceof Date) {
      dateInstance = date;
    } else if (typeof date === 'string') {
      // Try parsing as ISO string (common for DB drivers returning strings)
      dateInstance = new Date(date);
    } else if (typeof date === 'number') {
      // Treat as millisecond timestamp
      dateInstance = new Date(date);
    } else {
      throw new TypeError(
        `Cannot format date: received ${typeof date}. Expected Date, string, or number.`,
      );
    }

    // Validate the Date is valid
    if (Number.isNaN(dateInstance.getTime())) {
      const dateStr = String(date);
      throw new TypeError(
        `Cannot format date: invalid date value "${dateStr}". Expected valid Date, ISO string, or millisecond timestamp.`,
      );
    }

    // Format after normalization
    const year = dateInstance.getFullYear();
    const month = String(dateInstance.getMonth() + 1).padStart(2, '0');
    const day = String(dateInstance.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
