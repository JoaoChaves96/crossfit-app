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

/**
 * GetClassBookingsService: Query handler for retrieving booked athletes for a class
 *
 * Access rules:
 * - Coach assigned to the class (active in the gym and coachUserId matches)
 * - Gym owner of the gym the class belongs to
 *
 * gymId scoping is enforced: the class must belong to the gym in the route param.
 * Returns all active bookings (booked + waitlisted) with athlete display names.
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
   * @returns All active bookings with athlete userId and display name
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

    const activeBookings = bookingEntities.filter(
      (b) => b.status === 'booked' || b.status === 'waitlisted',
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
        };
      }),
    );

    return { bookings };
  }
}
