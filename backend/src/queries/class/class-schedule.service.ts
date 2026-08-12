import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClassRepository } from '../../repositories/class.repository';
import { BookingRepository } from '../../repositories/booking.repository';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { GymService } from '../../domain/gym/gym.service';
import { ClassScheduleItemDto } from './dto/class-schedule-item.dto';
import { GetClassScheduleResponseDto } from './dto/get-class-schedule-response.dto';
import { CoachClassItemDto } from './dto/coach-class-item.dto';
import { GetCoachClassesResponseDto } from './dto/get-coach-classes-response.dto';

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
    private readonly gymStaffService: GymStaffService,
    private readonly gymService: GymService,
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

    // Step 2b: Refuse the schedule outright once the plan has lapsed.
    // The row can still read 'active' between MembershipRenewalScheduler ticks,
    // so compare expiresAt to now rather than trusting status.
    // A null expiresAt means unlimited: never expired, never a cutoff.
    const planExpiresAt = activePlan.expiresAt
      ? new Date(activePlan.expiresAt)
      : null;

    if (planExpiresAt && planExpiresAt.getTime() <= Date.now()) {
      throw new ForbiddenException('Athlete membership plan has expired');
    }

    // Step 3: Extract the list of class type IDs the athlete can access
    // MembershipPlan.classTypes is a simple-array column: string[]
    const allowedClassTypeIds = activePlan.membershipPlan.classTypes || [];

    // Step 4: Fetch all non-archived classes in the gym
    const allClasses = await this.classRepository.getClassesByGym(gymId);

    // Step 5: Filter to non-archived classes of an allowed type that also fall
    // within the plan's coverage. A class after the cutoff is HIDDEN, not merely
    // unbookable.
    const eligibleClasses = allClasses.filter(
      (cls) =>
        cls.state !== 'archived' &&
        allowedClassTypeIds.includes(cls.classTypeId) &&
        this.isWithinPlanCoverage(cls.scheduledDate, planExpiresAt),
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
          coachUserId: cls.coachUserId,
          coachName: cls.coach?.name || 'Unknown Coach',
          spaceId: cls.spaceId,
          spaceName: cls.space?.name || 'Unknown Space',
          capacity: cls.capacity,
          duration: cls.duration,
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

    const gym = await this.gymService.getGymById(gymId);

    return {
      gymName: gym?.name ?? '',
      planExpiresAt: planExpiresAt ? this.formatDate(planExpiresAt) : null,
      classes: classItems,
    };
  }

  /**
   * Get all non-archived classes for a gym, without membership filtering.
   * Intended for gym owner schedule management.
   *
   * @param gymId - The gym to fetch classes from
   * @returns All non-archived classes in the gym sorted by date/time
   */
  async getClassScheduleForOwner(
    gymId: string,
  ): Promise<GetClassScheduleResponseDto> {
    // Fetch all non-archived classes in the gym
    const allClasses = await this.classRepository.getClassesByGym(gymId);

    const nonArchivedClasses = allClasses.filter(
      (cls) => cls.state !== 'archived',
    );

    const classItems: ClassScheduleItemDto[] = await Promise.all(
      nonArchivedClasses.map(async (cls) => {
        const bookedCount = await this.bookingRepository.countBookedBookings(
          cls.id,
        );

        return {
          id: cls.id,
          classTypeId: cls.classTypeId,
          classTypeName: cls.classType?.name || 'Unknown',
          scheduledDate: this.formatDate(cls.scheduledDate),
          scheduledTime: cls.scheduledTime,
          coachUserId: cls.coachUserId,
          coachName: cls.coach?.name || 'Unknown Coach',
          spaceId: cls.spaceId,
          spaceName: cls.space?.name || 'Unknown Space',
          capacity: cls.capacity,
          duration: cls.duration,
          bookedCount,
          state: cls.state,
        };
      }),
    );

    classItems.sort((a, b) => {
      const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCompare !== 0) return dateCompare;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    const gym = await this.gymService.getGymById(gymId);

    return {
      gymName: gym?.name ?? '',
      planExpiresAt: null,
      classes: classItems,
    };
  }

  /**
   * Get all non-archived classes assigned to the authenticated coach in the given gym.
   * Enforces both gym scoping (gymId) and coach scoping (coachUserId = requesting user).
   *
   * @param gymId - The gym to fetch classes from
   * @param coachUserId - The coach requesting their assigned classes
   * @returns Non-archived classes assigned to the coach, sorted by date/time
   * @throws ForbiddenException if user is not an active coach in this gym
   */
  async getCoachClasses(
    gymId: string,
    coachUserId: string,
  ): Promise<GetCoachClassesResponseDto> {
    const isCoach = await this.gymStaffService.isCoach(coachUserId, gymId);
    if (!isCoach) {
      throw new ForbiddenException('User is not an active coach in this gym');
    }

    const classes = await this.classRepository.getClassesByGymAndCoach(
      gymId,
      coachUserId,
    );
    const nonArchivedClasses = classes.filter(
      (cls) => cls.state !== 'archived',
    );

    const classItems: CoachClassItemDto[] = await Promise.all(
      nonArchivedClasses.map(async (cls) => {
        const bookedCount = await this.bookingRepository.countBookedBookings(
          cls.id,
        );

        return {
          id: cls.id,
          scheduledDate: this.formatDate(cls.scheduledDate),
          scheduledTime: cls.scheduledTime,
          spaceName: cls.space?.name || 'Unknown Space',
          classTypeName: cls.classType?.name || 'Unknown',
          capacity: cls.capacity,
          duration: cls.duration,
          bookedCount,
          state: cls.state,
        };
      }),
    );

    return { classes: classItems };
  }

  /**
   * Get a single class by ID, scoped to the gym.
   * Intended for gym owners and coaches.
   *
   * @param gymId - The gym the class must belong to
   * @param classId - The class to retrieve
   * @returns The class detail including spaceName
   * @throws NotFoundException if the class does not exist or does not belong to the gym
   */
  async getClassDetail(
    gymId: string,
    classId: string,
  ): Promise<ClassScheduleItemDto> {
    const cls = await this.classRepository.getClassById(classId, gymId);

    if (!cls) {
      throw new NotFoundException(
        `Class ${classId} not found in gym ${gymId}`,
      );
    }

    const bookedCount = await this.bookingRepository.countBookedBookings(cls.id);

    return {
      id: cls.id,
      classTypeId: cls.classTypeId,
      classTypeName: cls.classType?.name || 'Unknown',
      scheduledDate: this.formatDate(cls.scheduledDate),
      scheduledTime: cls.scheduledTime,
      coachUserId: cls.coachUserId,
      coachName: cls.coach?.name || 'Unknown Coach',
      spaceId: cls.spaceId,
      spaceName: cls.space?.name || 'Unknown Space',
      capacity: cls.capacity,
      duration: cls.duration,
      bookedCount,
      state: cls.state,
    };
  }

  /**
   * A class is covered when the plan is unlimited, or when the class falls on or
   * before the plan's expiry date. Compared date-to-date (not instant-to-instant)
   * on the server-local calendar — the same calendar formatDate emits — so a
   * class later in the day on the expiry date still counts as covered.
   */
  private isWithinPlanCoverage(
    scheduledDate: Date | string | number,
    planExpiresAt: Date | null,
  ): boolean {
    if (!planExpiresAt) return true;

    return this.formatDate(scheduledDate) <= this.formatDate(planExpiresAt);
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
