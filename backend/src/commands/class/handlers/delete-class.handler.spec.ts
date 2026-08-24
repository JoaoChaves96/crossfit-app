import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteClassHandler } from './delete-class.handler';
import { DeleteClassCommand } from '../delete-class.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { BookingEntity } from '../../../domain/booking/entities/booking.entity';
import { ClassCancelledEvent } from '../../../domain/notification/events/class-cancelled.event';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DeleteClassHandler', () => {
  let handler: DeleteClassHandler;
  let classRepository: ClassRepository;
  let bookingRepository: BookingRepository;
  let eventEmitter: EventEmitter2;

  const mockGymId = 'gym-123';
  const mockClassId = 'class-123';

  function buildClassEntity(state: ClassEntity['state']): ClassEntity {
    return {
      id: mockClassId,
      gymId: mockGymId,
      classTypeId: 'ct-123',
      coachUserId: 'coach-123',
      spaceId: 'space-123',
      // `@Column('date')` hydrates as a bare 'YYYY-MM-DD' string, never a Date.
      scheduledDate: '2026-06-01' as unknown as Date,
      scheduledTime: '10:00',
      capacity: 20,
      duration: 60,
      loggable: true,
      state,
      createdAt: new Date(),
      lastModifiedAt: new Date(),
      deletedAt: null,
      classType: { name: 'WOD' } as ClassEntity['classType'],
    } as ClassEntity;
  }

  function bookedBy(...userIds: string[]): BookingEntity[] {
    return userIds.map(
      (userId) => ({ userId, status: 'booked' }) as BookingEntity,
    );
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteClassHandler,
        {
          provide: ClassRepository,
          useValue: {
            getClassById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: BookingRepository,
          useValue: {
            getBookedBookingsByClass: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<DeleteClassHandler>(DeleteClassHandler);
    classRepository = module.get<ClassRepository>(ClassRepository);
    bookingRepository = module.get<BookingRepository>(BookingRepository);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('class not found', () => {
    it('should throw NotFoundException when class does not exist', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

      const command = new DeleteClassCommand(mockGymId, mockClassId);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('state guard', () => {
    const nonPublishedStates: ClassEntity['state'][] = [
      'booking_closed',
      'in_progress',
      'completed',
      'archived',
    ];

    it.each(nonPublishedStates)(
      'should throw BadRequestException when class is in %s state',
      async (state) => {
        const cls = buildClassEntity(state);
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

        const command = new DeleteClassCommand(mockGymId, mockClassId);

        await expect(handler.execute(command)).rejects.toThrow(
          BadRequestException,
        );
      },
    );
  });

  describe('successful soft-delete on published class', () => {
    it('should set deletedAt and lastModifiedAt, persist via save, and return id + deletedAt', async () => {
      const cls = buildClassEntity('published');
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue({ ...cls, deletedAt: new Date() } as ClassEntity);

      const command = new DeleteClassCommand(mockGymId, mockClassId);

      const result = await handler.execute(command);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      const entityPassedToSave = saveSpy.mock.calls[0][0];
      expect(entityPassedToSave.deletedAt).toBeInstanceOf(Date);
      expect(entityPassedToSave.lastModifiedAt).toBeInstanceOf(Date);
      // deletedAt and lastModifiedAt should be the same timestamp
      expect(entityPassedToSave.deletedAt).toEqual(
        entityPassedToSave.lastModifiedAt,
      );

      expect(result.id).toBe(mockClassId);
      expect(result.deletedAt).toBeInstanceOf(Date);
    });

    it('should NOT hard-delete the record — state should remain accessible on the entity', async () => {
      const cls = buildClassEntity('published');
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue({ ...cls } as ClassEntity);

      const command = new DeleteClassCommand(mockGymId, mockClassId);

      await handler.execute(command);

      // save was called (soft-delete), not a hard remove
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('class.cancelled notification event', () => {
    beforeEach(() => {
      const cls = buildClassEntity('published');
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(classRepository, 'save')
        .mockImplementation(async (entity) => entity as ClassEntity);
    });

    it('should emit class.cancelled for every booked athlete', async () => {
      jest
        .spyOn(bookingRepository, 'getBookedBookingsByClass')
        .mockResolvedValue(bookedBy('athlete-1', 'athlete-2'));

      await handler.execute(new DeleteClassCommand(mockGymId, mockClassId));

      expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'class.cancelled',
        new ClassCancelledEvent(
          mockGymId,
          mockClassId,
          'WOD',
          '2026-06-01',
          '10:00',
          ['athlete-1', 'athlete-2'],
        ),
      );
    });

    it('should not emit when the class has no booked athletes', async () => {
      jest
        .spyOn(bookingRepository, 'getBookedBookingsByClass')
        .mockResolvedValue([]);

      await handler.execute(new DeleteClassCommand(mockGymId, mockClassId));

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not emit when the state guard rejects the delete', async () => {
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(buildClassEntity('in_progress'));
      jest
        .spyOn(bookingRepository, 'getBookedBookingsByClass')
        .mockResolvedValue(bookedBy('athlete-1'));

      await expect(
        handler.execute(new DeleteClassCommand(mockGymId, mockClassId)),
      ).rejects.toThrow(BadRequestException);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });
  });
});
