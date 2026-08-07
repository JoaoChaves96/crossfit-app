import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GetClassBookingsService } from './get-class-bookings.service';
import { ClassRepository } from '../../repositories/class.repository';
import { BookingRepository } from '../../repositories/booking.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { UserService } from '../../domain/user/user.service';

describe('GetClassBookingsService', () => {
  let service: GetClassBookingsService;
  let classRepository: { getClassById: jest.Mock };
  let bookingRepository: { getActiveBookingsByClass: jest.Mock };
  let gymStaffService: { isGymOwner: jest.Mock; isCoach: jest.Mock };
  let userService: { getUserById: jest.Mock };

  const gymId = 'gym-1';
  const classId = 'class-1';
  const ownerUserId = 'owner-1';
  const coachUserId = 'coach-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetClassBookingsService,
        { provide: ClassRepository, useValue: { getClassById: jest.fn() } },
        {
          provide: BookingRepository,
          useValue: { getActiveBookingsByClass: jest.fn() },
        },
        {
          provide: GymStaffService,
          useValue: { isGymOwner: jest.fn(), isCoach: jest.fn() },
        },
        { provide: UserService, useValue: { getUserById: jest.fn() } },
      ],
    }).compile();

    service = module.get(GetClassBookingsService);
    classRepository = module.get(ClassRepository);
    bookingRepository = module.get(BookingRepository);
    gymStaffService = module.get(GymStaffService);
    userService = module.get(UserService);
  });

  function mockClass(overrides = {}) {
    classRepository.getClassById.mockResolvedValue({
      id: classId,
      gymId,
      coachUserId,
      ...overrides,
    });
  }

  function asOwner() {
    gymStaffService.isGymOwner.mockResolvedValue(true);
    gymStaffService.isCoach.mockResolvedValue(false);
  }

  function booking(
    id: string,
    userId: string,
    status: 'booked' | 'waitlisted' | 'cancelled',
    bookedPosition: number | null,
  ) {
    return { id, userId, classId, status, bookedPosition };
  }

  function resolveNamesFromUserId() {
    userService.getUserById.mockImplementation((userId: string) =>
      Promise.resolve({ id: userId, name: `name-${userId}` }),
    );
  }

  describe('waitlist position', () => {
    it('carries bookedPosition as waitlistPosition for waitlisted entries', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('b-1', 'athlete-1', 'waitlisted', 1),
        booking('b-2', 'athlete-2', 'waitlisted', 2),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings).toEqual([
        {
          bookingId: 'b-1',
          athleteUserId: 'athlete-1',
          displayName: 'name-athlete-1',
          status: 'waitlisted',
          waitlistPosition: 1,
        },
        {
          bookingId: 'b-2',
          athleteUserId: 'athlete-2',
          displayName: 'name-athlete-2',
          status: 'waitlisted',
          waitlistPosition: 2,
        },
      ]);
    });

    it('returns null waitlistPosition for booked entries', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('b-1', 'athlete-1', 'booked', null),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings[0].waitlistPosition).toBeNull();
    });

    it('returns null waitlistPosition for a booked entry even if a stale bookedPosition is set', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('b-1', 'athlete-1', 'booked', 3),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings[0].waitlistPosition).toBeNull();
    });

    it('returns null waitlistPosition for a waitlisted entry with no assigned position', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('b-1', 'athlete-1', 'waitlisted', null),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings[0].waitlistPosition).toBeNull();
    });
  });

  describe('ordering', () => {
    it('lists booked entries first, then waitlisted entries in promotion order', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      // Repository order is createdAt ASC, which does not match promotion order.
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('w-3', 'athlete-w3', 'waitlisted', 3),
        booking('bk-1', 'athlete-b1', 'booked', null),
        booking('w-1', 'athlete-w1', 'waitlisted', 1),
        booking('bk-2', 'athlete-b2', 'booked', null),
        booking('w-2', 'athlete-w2', 'waitlisted', 2),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings.map((b) => b.bookingId)).toEqual([
        'bk-1',
        'bk-2',
        'w-1',
        'w-2',
        'w-3',
      ]);
      expect(bookings.map((b) => b.waitlistPosition)).toEqual([
        null,
        null,
        1,
        2,
        3,
      ]);
    });

    it('preserves repository (createdAt ASC) order among booked entries', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('bk-1', 'athlete-b1', 'booked', null),
        booking('bk-2', 'athlete-b2', 'booked', null),
        booking('bk-3', 'athlete-b3', 'booked', null),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings.map((b) => b.bookingId)).toEqual([
        'bk-1',
        'bk-2',
        'bk-3',
      ]);
    });

    it('sorts waitlisted entries without a position last', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('w-none', 'athlete-wn', 'waitlisted', null),
        booking('w-2', 'athlete-w2', 'waitlisted', 2),
        booking('w-1', 'athlete-w1', 'waitlisted', 1),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings.map((b) => b.bookingId)).toEqual([
        'w-1',
        'w-2',
        'w-none',
      ]);
    });
  });

  describe('filtering and access control', () => {
    it('excludes cancelled bookings', async () => {
      mockClass();
      asOwner();
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('bk-1', 'athlete-b1', 'booked', null),
        booking('c-1', 'athlete-c1', 'cancelled', null),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings.map((b) => b.bookingId)).toEqual(['bk-1']);
    });

    it('falls back to the userId when the user cannot be resolved', async () => {
      mockClass();
      asOwner();
      userService.getUserById.mockResolvedValue(null);
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('bk-1', 'athlete-b1', 'booked', null),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        ownerUserId,
      );

      expect(bookings[0].displayName).toBe('athlete-b1');
    });

    it('allows the assigned coach', async () => {
      mockClass();
      gymStaffService.isGymOwner.mockResolvedValue(false);
      gymStaffService.isCoach.mockResolvedValue(true);
      resolveNamesFromUserId();
      bookingRepository.getActiveBookingsByClass.mockResolvedValue([
        booking('w-1', 'athlete-w1', 'waitlisted', 1),
      ]);

      const { bookings } = await service.getClassBookings(
        gymId,
        classId,
        coachUserId,
      );

      expect(bookings[0].waitlistPosition).toBe(1);
    });

    it('rejects a coach not assigned to the class', async () => {
      mockClass({ coachUserId: 'other-coach' });
      gymStaffService.isGymOwner.mockResolvedValue(false);
      gymStaffService.isCoach.mockResolvedValue(true);

      await expect(
        service.getClassBookings(gymId, classId, coachUserId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(bookingRepository.getActiveBookingsByClass).not.toHaveBeenCalled();
    });

    it('throws NotFound when the class does not belong to the gym', async () => {
      classRepository.getClassById.mockResolvedValue(null);

      await expect(
        service.getClassBookings(gymId, classId, ownerUserId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
