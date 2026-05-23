import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelBookingHandler } from './cancel-booking.handler';
import { CancelBookingCommand } from '../cancel-booking.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';

describe('CancelBookingHandler', () => {
  let handler: CancelBookingHandler;
  let classRepository: ClassRepository;
  let bookingRepository: BookingRepository;
  let bookingDbRepository: {
    save: jest.Mock;
  };

  const mockGymId = 'gym-123';
  const mockUserId = 'user-athlete-123';
  const mockBookingId = 'booking-123';
  const mockClassId = 'class-123';

  const mockPublishedClass = {
    id: mockClassId,
    gymId: mockGymId,
    state: 'published',
    capacity: 10,
  };

  const mockBookedBooking = (): BookingEntity => ({
    id: mockBookingId,
    classId: mockClassId,
    userId: mockUserId,
    status: 'booked',
    bookedPosition: null,
    createdAt: new Date('2024-01-01'),
    cancelledAt: null,
  } as BookingEntity);

  const mockWaitlistedBooking = (): BookingEntity => ({
    id: mockBookingId,
    classId: mockClassId,
    userId: mockUserId,
    status: 'waitlisted',
    bookedPosition: 1,
    createdAt: new Date('2024-01-01'),
    cancelledAt: null,
  } as BookingEntity);

  beforeEach(async () => {
    bookingDbRepository = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CancelBookingHandler,
        {
          provide: ClassRepository,
          useValue: {
            getClassById: jest.fn(),
          },
        },
        {
          provide: BookingRepository,
          useValue: {
            getBookingById: jest.fn(),
            save: jest.fn(),
            getFirstWaitlistedBooking: jest.fn(),
            getWaitlistedBookingsByClass: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(BookingEntity),
          useValue: bookingDbRepository,
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<CancelBookingHandler>(CancelBookingHandler);
    classRepository = module.get<ClassRepository>(ClassRepository);
    bookingRepository = module.get<BookingRepository>(BookingRepository);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    describe('booking not found', () => {
      it('should throw NotFoundException when the booking does not exist', async () => {
        const command = new CancelBookingCommand(mockUserId, mockBookingId, mockGymId);

        jest.spyOn(bookingRepository, 'getBookingById').mockResolvedValue(null);

        await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      });
    });

    describe('booking belongs to a different athlete', () => {
      it('should throw ForbiddenException when the booking userId does not match the command userId', async () => {
        const command = new CancelBookingCommand('different-user-id', mockBookingId, mockGymId);

        jest.spyOn(bookingRepository, 'getBookingById').mockResolvedValue(mockBookedBooking());

        await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      });
    });

    describe('cancel a confirmed booking', () => {
      it('should cancel the booking and restore class capacity when no waitlist exists', async () => {
        const command = new CancelBookingCommand(mockUserId, mockBookingId, mockGymId);

        const booking = mockBookedBooking();
        jest.spyOn(bookingRepository, 'getBookingById').mockResolvedValue(booking);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);

        const saveSpy = jest.spyOn(bookingRepository, 'save').mockResolvedValue({ ...booking, status: 'cancelled', cancelledAt: new Date() } as BookingEntity);

        // No waitlisted bookings for this class
        jest.spyOn(bookingRepository, 'getFirstWaitlistedBooking').mockResolvedValue(null);

        const result = await handler.execute(command);

        expect(result.status).toBe('cancelled');
        expect(result.cancelledAt).not.toBeNull();

        // The booking was saved with cancelled status
        const savedArg: BookingEntity = saveSpy.mock.calls[0][0];
        expect(savedArg.status).toBe('cancelled');
        expect(savedArg.cancelledAt).toBeInstanceOf(Date);

        // No promotion happened
        expect(bookingRepository.getFirstWaitlistedBooking).toHaveBeenCalledWith(mockClassId);
        expect(bookingDbRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('cancel a waitlisted booking', () => {
      it('should cancel the booking without triggering promotion logic', async () => {
        const command = new CancelBookingCommand(mockUserId, mockBookingId, mockGymId);

        const booking = mockWaitlistedBooking();
        jest.spyOn(bookingRepository, 'getBookingById').mockResolvedValue(booking);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);

        const saveSpy = jest.spyOn(bookingRepository, 'save').mockResolvedValue({ ...booking, status: 'cancelled', cancelledAt: new Date() } as BookingEntity);

        const result = await handler.execute(command);

        expect(result.status).toBe('cancelled');

        const savedArg: BookingEntity = saveSpy.mock.calls[0][0];
        expect(savedArg.status).toBe('cancelled');

        // Promotion logic must NOT be triggered for a waitlisted cancellation
        expect(bookingRepository.getFirstWaitlistedBooking).not.toHaveBeenCalled();
        expect(bookingDbRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('cancel confirmed booking when waitlist exists', () => {
      it('should promote the first waitlisted athlete and renumber remaining positions', async () => {
        const command = new CancelBookingCommand(mockUserId, mockBookingId, mockGymId);

        const booking = mockBookedBooking();
        jest.spyOn(bookingRepository, 'getBookingById').mockResolvedValue(booking);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);
        jest.spyOn(bookingRepository, 'save').mockResolvedValue({ ...booking, status: 'cancelled', cancelledAt: new Date() } as BookingEntity);

        // First waitlisted athlete to be promoted
        const firstWaitlisted: BookingEntity = {
          id: 'waitlisted-booking-1',
          classId: mockClassId,
          userId: 'user-waitlist-1',
          status: 'waitlisted',
          bookedPosition: 1,
          createdAt: new Date('2024-01-02'),
          cancelledAt: null,
        } as BookingEntity;

        // Two remaining athletes behind the promoted one
        const remainingWaitlisted: BookingEntity[] = [
          {
            id: 'waitlisted-booking-2',
            classId: mockClassId,
            userId: 'user-waitlist-2',
            status: 'waitlisted',
            bookedPosition: 2,
            createdAt: new Date('2024-01-03'),
            cancelledAt: null,
          } as BookingEntity,
          {
            id: 'waitlisted-booking-3',
            classId: mockClassId,
            userId: 'user-waitlist-3',
            status: 'waitlisted',
            bookedPosition: 3,
            createdAt: new Date('2024-01-04'),
            cancelledAt: null,
          } as BookingEntity,
        ];

        const getFirstSpy = jest.spyOn(bookingRepository, 'getFirstWaitlistedBooking').mockResolvedValue(firstWaitlisted);
        const promoteBookingSaveSpy = jest.spyOn(bookingRepository, 'save');

        // After promotion, getWaitlistedBookingsByClass returns the two remaining athletes
        jest.spyOn(bookingRepository, 'getWaitlistedBookingsByClass').mockResolvedValue(remainingWaitlisted);

        bookingDbRepository.save.mockResolvedValue(remainingWaitlisted);

        await handler.execute(command);

        // First waitlisted was fetched
        expect(getFirstSpy).toHaveBeenCalledWith(mockClassId);

        // Promoted booking was saved with booked status and no position
        const promotedSaveCall = promoteBookingSaveSpy.mock.calls.find(
          (call) => call[0].id === 'waitlisted-booking-1',
        );
        expect(promotedSaveCall).toBeDefined();
        const promotedEntity = promotedSaveCall![0];
        expect(promotedEntity.status).toBe('booked');
        expect(promotedEntity.bookedPosition).toBeNull();

        // Remaining waitlist was renumbered
        expect(bookingDbRepository.save).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'waitlisted-booking-2', bookedPosition: 1 }),
            expect.objectContaining({ id: 'waitlisted-booking-3', bookedPosition: 2 }),
          ]),
        );
      });

      it('should promote the first waitlisted athlete and not call bulk save when no athletes remain on waitlist after promotion', async () => {
        const command = new CancelBookingCommand(mockUserId, mockBookingId, mockGymId);

        const booking = mockBookedBooking();
        jest.spyOn(bookingRepository, 'getBookingById').mockResolvedValue(booking);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(mockPublishedClass as any);
        jest.spyOn(bookingRepository, 'save').mockResolvedValue({ ...booking, status: 'cancelled', cancelledAt: new Date() } as BookingEntity);

        const firstWaitlisted: BookingEntity = {
          id: 'waitlisted-booking-1',
          classId: mockClassId,
          userId: 'user-waitlist-1',
          status: 'waitlisted',
          bookedPosition: 1,
          createdAt: new Date('2024-01-02'),
          cancelledAt: null,
        } as BookingEntity;

        jest.spyOn(bookingRepository, 'getFirstWaitlistedBooking').mockResolvedValue(firstWaitlisted);

        // No remaining waitlisted after promotion
        jest.spyOn(bookingRepository, 'getWaitlistedBookingsByClass').mockResolvedValue([]);

        await handler.execute(command);

        // Promoted booking was saved
        const promoteBookingSaveSpy = jest.spyOn(bookingRepository, 'save');
        // Bulk renumber save was NOT called because the list is empty
        expect(bookingDbRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
