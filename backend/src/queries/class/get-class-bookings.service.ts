import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClassRepository } from '../../repositories/class.repository';
import { BookingRepository } from '../../repositories/booking.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { UserService } from '../../domain/user/user.service';
import { GetClassBookingsResponseDto } from './dto/get-class-bookings-response.dto';
import { ClassBookingItemDto } from './dto/class-booking-item.dto';

/** Booked athletes are listed before waitlisted ones. */
const STATUS_ORDER: Record<'booked' | 'waitlisted', number> = {
  booked: 0,
  waitlisted: 1,
};

/** Entries without an assigned queue position sort last. */
const UNPOSITIONED_SORT_KEY = Number.MAX_SAFE_INTEGER;

function waitlistSortKey(status: string): number {
  return STATUS_ORDER[status as 'booked' | 'waitlisted'];
}

function positionSortKey(bookedPosition: number | null): number {
  return bookedPosition ?? UNPOSITIONED_SORT_KEY;
}

/**
 * GetClassBookingsService: Query handler for retrieving booked athletes for a class
 *
 * Access rules:
 * - Coach assigned to the class (active in the gym and coachUserId matches)
 * - Gym owner of the gym the class belongs to
 *
 * gymId scoping is enforced: the class must belong to the gym in the route param.
 * Returns all active bookings (booked + waitlisted) with athlete display names.
 *
 * Ordering: booked athletes first (in booking order), then waitlisted athletes in
 * promotion order (bookedPosition ASC). This matches the order the promotion logic
 * follows, so the list can be rendered as-is without misrepresenting the queue.
 */
@Injectable()
export class GetClassBookingsService {
  constructor(
    private readonly classRepository: ClassRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly gymStaffService: GymStaffService,
    private readonly userService: UserService,
  ) {}

  /**
   * Retrieve all active bookings for a class, enforcing gymId scoping and access control.
   *
   * @param gymId - The gym ID from the route param
   * @param classId - The class ID from the route param
   * @param requestingUserId - The authenticated user requesting the bookings
   * @returns All active bookings with athlete userId, display name and waitlist position,
   *          booked entries first then waitlisted entries in promotion order
   * @throws NotFoundException if the class does not exist or does not belong to the gym
   * @throws ForbiddenException if the requesting user is neither the assigned coach nor the gym owner
   */
  async getClassBookings(
    gymId: string,
    classId: string,
    requestingUserId: string,
  ): Promise<GetClassBookingsResponseDto> {
    // Verify class exists and belongs to the specified gym (gymId scoping)
    const classEntity = await this.classRepository.getClassById(classId, gymId);

    if (!classEntity) {
      throw new NotFoundException(`Class ${classId} not found in gym ${gymId}`);
    }

    // Verify gymId on the class matches the route param (defense in depth)
    if (classEntity.gymId !== gymId) {
      throw new ForbiddenException('Class does not belong to this gym');
    }

    // Access control: allow coaches assigned to this class or gym owners
    const isOwner = await this.gymStaffService.isGymOwner(
      requestingUserId,
      gymId,
    );
    const isAssignedCoach =
      classEntity.coachUserId === requestingUserId &&
      (await this.gymStaffService.isCoach(requestingUserId, gymId));

    if (!isOwner && !isAssignedCoach) {
      throw new ForbiddenException(
        'Only the assigned coach or a gym owner can view class bookings',
      );
    }

    // Fetch all active bookings (booked + waitlisted) for the class
    const bookingEntities =
      await this.bookingRepository.getActiveBookingsByClass(classId);

    const activeBookings = bookingEntities
      .filter((b) => b.status === 'booked' || b.status === 'waitlisted')
      // The repository returns bookings in createdAt ASC order. Array.sort is
      // stable, so booked athletes keep that order while waitlisted athletes are
      // re-ordered by bookedPosition ASC — the order promotion actually follows.
      .sort(
        (a, b) =>
          waitlistSortKey(a.status) - waitlistSortKey(b.status) ||
          positionSortKey(a.bookedPosition) - positionSortKey(b.bookedPosition),
      );

    // Resolve athlete display names
    const bookings: ClassBookingItemDto[] = await Promise.all(
      activeBookings.map(async (booking) => {
        const user = await this.userService.getUserById(booking.userId);
        const displayName = user ? user.name : booking.userId;

        return {
          bookingId: booking.id,
          athleteUserId: booking.userId,
          displayName,
          status: booking.status as 'booked' | 'waitlisted',
          waitlistPosition:
            booking.status === 'waitlisted'
              ? (booking.bookedPosition ?? null)
              : null,
        };
      }),
    );

    return { bookings };
  }
}
