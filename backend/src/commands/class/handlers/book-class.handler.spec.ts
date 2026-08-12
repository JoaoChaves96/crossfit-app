import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BookClassHandler } from './book-class.handler';
import { BookClassCommand } from '../book-class.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { GymMembershipRepository } from '../../../repositories/gym-membership.repository';
import { AthleteMembershipPlanRepository } from '../../../repositories/athlete-membership-plan.repository';
import { GymService } from '../../../domain/gym/gym.service';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';

describe('BookClassHandler', () => {
  let handler: BookClassHandler;
  let classRepository: ClassRepository;
  let gymMembershipRepository: GymMembershipRepository;
  let athleteMembershipPlanRepository: AthleteMembershipPlanRepository;
  let gymService: GymService;
  let bookingRepository: {
    findOne: jest.Mock;
    count: jest.Mock;
    save: jest.Mock;
  };

  const mockGymId = 'gym-123';
  const mockUserId = 'user-athlete-123';
  const mockClassId = 'class-123';
  const mockClassTypeId = 'class-type-123';
  const mockGymMembershipId = 'gym-membership-123';

  const mockActiveGym = { id: mockGymId, status: 'active' };

  const mockPublishedClass = {
    id: mockClassId,
    gymId: mockGymId,
    classTypeId: mockClassTypeId,
    state: 'published',
    capacity: 10,
  };

  const mockActiveGymMembership = {
    id: mockGymMembershipId,
    userId: mockUserId,
    gymId: mockGymId,
    status: 'active',
  };

  const mockActiveMembershipPlan = {
    id: 'plan-123',
    gymMembershipId: mockGymMembershipId,
    status: 'active',
    membershipPlan: {
      classTypes: [mockClassTypeId],
    },
  };

  beforeEach(async () => {
    bookingRepository = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookClassHandler,
        {
          provide: ClassRepository,
          useValue: {
            getClassById: jest.fn(),
          },
        },
        {
          provide: GymMembershipRepository,
          useValue: {
            getActiveGymMembershipByUserAndGym: jest.fn(),
          },
        },
        {
          provide: AthleteMembershipPlanRepository,
          useValue: {
            getActivePlanByGymMembership: jest.fn(),
          },
        },
        {
          provide: GymService,
          useValue: {
            getGymById: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: bookingRepository,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<BookClassHandler>(BookClassHandler);
    classRepository = module.get<ClassRepository>(ClassRepository);
    gymMembershipRepository = module.get<GymMembershipRepository>(GymMembershipRepository);
    athleteMembershipPlanRepository = module.get<AthleteMembershipPlanRepository>(AthleteMembershipPlanRepository);
    gymService = module.get<GymService>(GymService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    describe('class not found', () => {
      it('should throw NotFoundException when the class does not exist', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

        await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      });
    });

    describe('class not in valid state', () => {
      it('should throw BadRequestException when class state is not published', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          state: 'completed',
        } as any);

        await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when class state is booking_closed', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          state: 'booking_closed',
        } as any);

        await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when class state is in_progress', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          state: 'in_progress',
        } as any);

        await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      });
    });

    describe('class at capacity', () => {
      it('should create a waitlisted booking with the correct position when class is full', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          capacity: 10,
        } as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(mockActiveGymMembership as any);
        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue(mockActiveMembershipPlan as any);

        // No existing booking for this athlete
        bookingRepository.findOne.mockResolvedValue(null);

        // bookedCount equals capacity (class is full), 2 already on waitlist
        bookingRepository.count
          .mockResolvedValueOnce(10)  // booked count = capacity
          .mockResolvedValueOnce(2);  // waitlisted count

        const savedBooking: Partial<BookingEntity> = {
          id: 'new-booking-id',
          classId: mockClassId,
          userId: mockUserId,
          status: 'waitlisted',
          bookedPosition: 3,
          createdAt: new Date(),
          cancelledAt: null,
        };
        bookingRepository.save.mockResolvedValue(savedBooking);

        const result = await handler.execute(command);

        expect(result.status).toBe('waitlisted');
        expect(result.bookedPosition).toBe(3);

        const savedArg: BookingEntity = bookingRepository.save.mock.calls[0][0];
        expect(savedArg.status).toBe('waitlisted');
        expect(savedArg.bookedPosition).toBe(3);
      });
    });

    describe('athlete already has a confirmed booking', () => {
      it('should throw ConflictException when the athlete already has a booked booking for the class', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(mockActiveGymMembership as any);
        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue(mockActiveMembershipPlan as any);

        bookingRepository.findOne.mockResolvedValue({
          id: 'existing-booking',
          classId: mockClassId,
          userId: mockUserId,
          status: 'booked',
        });

        await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      });
    });

    describe('athlete already on waitlist', () => {
      it('should throw ConflictException when the athlete already has a waitlisted booking for the class', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(mockActiveGymMembership as any);
        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue(mockActiveMembershipPlan as any);

        bookingRepository.findOne.mockResolvedValue({
          id: 'existing-booking',
          classId: mockClassId,
          userId: mockUserId,
          status: 'waitlisted',
        });

        await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      });
    });

    describe('membership check fails', () => {
      it('should throw ForbiddenException when athlete has no active gym membership', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(null);

        await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when athlete has no active membership plan', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(mockActiveGymMembership as any);
        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue(null);

        await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when the membership plan does not include this class type', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(mockActiveGymMembership as any);
        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue({
          ...mockActiveMembershipPlan,
          membershipPlan: {
            classTypes: ['different-class-type-id'],
          },
        } as any);

        await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      });
    });

    /**
     * Plan coverage is compared on the SERVER-LOCAL calendar (see
     * BookClassHandler.toDayString), so these fixtures build dates from local
     * components rather than `...Z` literals — the assertions then hold on any
     * host timezone.
     */
    describe('plan expiry', () => {
      const NOW = new Date(2026, 7, 11, 10, 0, 0); // 2026-08-11 10:00 local

      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(NOW);

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(mockActiveGymMembership as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          scheduledDate: new Date(2026, 7, 12, 9, 0, 0),
        } as any);

        bookingRepository.findOne.mockResolvedValue(null);
        bookingRepository.count.mockResolvedValue(0);
        bookingRepository.save.mockImplementation((booking: BookingEntity) => Promise.resolve(booking));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('403s with the expiry message when the plan has lapsed', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue({
          ...mockActiveMembershipPlan,
          expiresAt: new Date(2026, 7, 1, 10, 0, 0),
        } as any);

        await expect(handler.execute(command)).rejects.toThrow(
          'Athlete membership plan has expired',
        );
        expect(bookingRepository.save).not.toHaveBeenCalled();
      });

      it('403s with the cutoff message when the class is after the plan expiry', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue({
          ...mockActiveMembershipPlan,
          expiresAt: new Date(2026, 7, 15, 10, 0, 0),
        } as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          scheduledDate: new Date(2026, 7, 20, 9, 0, 0),
        } as any);

        await expect(handler.execute(command)).rejects.toThrow(
          'Class is scheduled after the athlete membership plan expires',
        );
        expect(bookingRepository.save).not.toHaveBeenCalled();
      });

      it('books a class falling on the plan expiry date', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        // Class is later in the day than the expiry instant, but on the same
        // calendar day: the member keeps their whole final day.
        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue({
          ...mockActiveMembershipPlan,
          expiresAt: new Date(2026, 7, 15, 10, 0, 0),
        } as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          scheduledDate: new Date(2026, 7, 15, 19, 0, 0),
        } as any);

        const result = await handler.execute(command);

        expect(result.status).toBe('booked');
      });

      it('books any class when the plan is unlimited', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue({
          ...mockActiveMembershipPlan,
          expiresAt: null,
        } as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          scheduledDate: new Date(2027, 0, 1, 9, 0, 0),
        } as any);

        const result = await handler.execute(command);

        expect(result.status).toBe('booked');
      });

      it('lets a coach book a class beyond any plan expiry', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'coach');

        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          scheduledDate: new Date(2027, 0, 1, 9, 0, 0),
        } as any);

        const result = await handler.execute(command);

        expect(result.status).toBe('booked');
        expect(athleteMembershipPlanRepository.getActivePlanByGymMembership).not.toHaveBeenCalled();
      });

      it('lets an owner book a class beyond any plan expiry', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'owner');

        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          scheduledDate: new Date(2027, 0, 1, 9, 0, 0),
        } as any);

        const result = await handler.execute(command);

        expect(result.status).toBe('booked');
        expect(athleteMembershipPlanRepository.getActivePlanByGymMembership).not.toHaveBeenCalled();
      });
    });

    describe('happy path: available class', () => {
      it('should create a confirmed booking when class has capacity', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'athlete');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          capacity: 10,
        } as any);
        jest.spyOn(gymMembershipRepository, 'getActiveGymMembershipByUserAndGym').mockResolvedValue(mockActiveGymMembership as any);
        jest.spyOn(athleteMembershipPlanRepository, 'getActivePlanByGymMembership').mockResolvedValue(mockActiveMembershipPlan as any);

        // No existing booking
        bookingRepository.findOne.mockResolvedValue(null);

        // 5 booked out of 10 capacity — space available
        bookingRepository.count.mockResolvedValueOnce(5);

        const savedBooking: Partial<BookingEntity> = {
          id: 'new-booking-id',
          classId: mockClassId,
          userId: mockUserId,
          status: 'booked',
          bookedPosition: null,
          createdAt: new Date(),
          cancelledAt: null,
        };
        bookingRepository.save.mockResolvedValue(savedBooking);

        const result = await handler.execute(command);

        expect(result.status).toBe('booked');
        expect(result.bookedPosition).toBeNull();

        const savedArg: BookingEntity = bookingRepository.save.mock.calls[0][0];
        expect(savedArg.status).toBe('booked');
        expect(savedArg.bookedPosition).toBeNull();
        expect(savedArg.classId).toBe(mockClassId);
        expect(savedArg.userId).toBe(mockUserId);
      });

      it('should skip membership checks for a gym owner', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'owner');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          capacity: 10,
        } as any);

        // No existing booking
        bookingRepository.findOne.mockResolvedValue(null);

        // 0 booked — space available
        bookingRepository.count.mockResolvedValueOnce(0);

        const savedBooking: Partial<BookingEntity> = {
          id: 'new-booking-id',
          classId: mockClassId,
          userId: mockUserId,
          status: 'booked',
          bookedPosition: null,
          createdAt: new Date(),
          cancelledAt: null,
        };
        bookingRepository.save.mockResolvedValue(savedBooking);

        const result = await handler.execute(command);

        expect(result.status).toBe('booked');
        expect(gymMembershipRepository.getActiveGymMembershipByUserAndGym).not.toHaveBeenCalled();
        expect(athleteMembershipPlanRepository.getActivePlanByGymMembership).not.toHaveBeenCalled();
      });

      it('should skip membership checks for a coach', async () => {
        const command = new BookClassCommand(mockUserId, mockClassId, mockGymId, 'coach');

        jest.spyOn(gymService, 'getGymById').mockResolvedValue(mockActiveGym as any);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...mockPublishedClass,
          capacity: 10,
        } as any);

        bookingRepository.findOne.mockResolvedValue(null);
        bookingRepository.count.mockResolvedValueOnce(0);

        const savedBooking: Partial<BookingEntity> = {
          id: 'new-booking-id',
          classId: mockClassId,
          userId: mockUserId,
          status: 'booked',
          bookedPosition: null,
          createdAt: new Date(),
          cancelledAt: null,
        };
        bookingRepository.save.mockResolvedValue(savedBooking);

        const result = await handler.execute(command);

        expect(result.status).toBe('booked');
        expect(gymMembershipRepository.getActiveGymMembershipByUserAndGym).not.toHaveBeenCalled();
        expect(athleteMembershipPlanRepository.getActivePlanByGymMembership).not.toHaveBeenCalled();
      });
    });
  });
});
