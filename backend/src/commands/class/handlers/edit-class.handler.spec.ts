import { Test, TestingModule } from '@nestjs/testing';
import { EditClassHandler } from './edit-class.handler';
import { EditClassCommand } from '../edit-class.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { BookingRepository } from '../../../repositories/booking.repository';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DateUtils } from 'typeorm/util/DateUtils';

describe('EditClassHandler', () => {
  let handler: EditClassHandler;
  let classRepository: ClassRepository;
  let bookingRepository: BookingRepository;
  let classTypeService: ClassTypeService;
  let gymStaffService: GymStaffService;
  let spaceService: SpaceService;

  const mockGymId = 'gym-123';
  const mockClassId = 'class-123';

  function buildPublishedClass(): ClassEntity {
    return {
      id: mockClassId,
      gymId: mockGymId,
      classTypeId: 'ct-original',
      coachUserId: 'coach-original',
      spaceId: 'space-original',
      // `@Column('date')` hydrates as a bare 'YYYY-MM-DD' string, never a Date.
      scheduledDate: '2026-06-01' as unknown as Date,
      scheduledTime: '09:00',
      capacity: 20,
      duration: 60,
      loggable: true,
      state: 'published',
      createdAt: new Date(),
      lastModifiedAt: new Date(),
      deletedAt: null,
      classType: { name: 'WOD' } as any,
      coach: { name: 'Coach Original' } as any,
      space: { name: 'Space A' } as any,
    } as ClassEntity;
  }

  function buildSavedResponse(cls: ClassEntity): ClassEntity {
    return {
      ...cls,
      classType: { name: 'WOD' } as any,
      coach: { name: 'Coach Original' } as any,
      space: { name: 'Space A' } as any,
    } as ClassEntity;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EditClassHandler,
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
            countBookedBookings: jest.fn(),
          },
        },
        {
          provide: ClassTypeService,
          useValue: {
            getClassTypeById: jest.fn(),
          },
        },
        {
          provide: GymStaffService,
          useValue: {
            getGymStaffByUserAndGym: jest.fn(),
          },
        },
        {
          provide: SpaceService,
          useValue: {
            getSpaceById: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<EditClassHandler>(EditClassHandler);
    classRepository = module.get<ClassRepository>(ClassRepository);
    bookingRepository = module.get<BookingRepository>(BookingRepository);
    classTypeService = module.get<ClassTypeService>(ClassTypeService);
    gymStaffService = module.get<GymStaffService>(GymStaffService);
    spaceService = module.get<SpaceService>(SpaceService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('class not found', () => {
    it('should throw NotFoundException when class does not exist', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

      const command = new EditClassCommand(mockGymId, mockClassId, undefined, undefined, undefined, undefined, undefined, undefined, undefined);

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
        const cls = buildPublishedClass();
        cls.state = state;
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

        const command = new EditClassCommand(
          mockGymId,
          mockClassId,
        );

        await expect(handler.execute(command)).rejects.toThrow(
          BadRequestException,
        );
      },
    );
  });

  describe('successful edit on published class', () => {
    it('should update partial fields and return updated class', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

      const newScheduledTime = '11:00';
      const newDuration = 45;

      const savedEntity = buildSavedResponse({
        ...cls,
        scheduledTime: newScheduledTime,
        duration: newDuration,
      });
      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue(savedEntity);
      jest
        .spyOn(bookingRepository, 'countBookedBookings')
        .mockResolvedValue(5);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        undefined,
        undefined,
        undefined,
        newScheduledTime,
        undefined,
        newDuration,
      );

      const result = await handler.execute(command);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      const entityPassedToSave = saveSpy.mock.calls[0][0];
      expect(entityPassedToSave.scheduledTime).toBe(newScheduledTime);
      expect(entityPassedToSave.duration).toBe(newDuration);
      expect(result.state).toBe('published');
      expect(result.bookedCount).toBe(5);
    });

    /**
     * Asserts on what is PERSISTED rather than on the response, because the
     * response now formats faithfully and would report a wrong stored day as if
     * it were right. `DateUtils.mixedDateToDateString` is the function TypeORM
     * runs on the way to a `@Column('date')`, and it reads LOCAL getters — so a
     * `Date` built from a bare day (UTC midnight) lands on the PREVIOUS day west
     * of UTC. Zone pinned to America/New_York by test/jest-tz.setup.ts.
     */
    it('persists the rescheduled calendar day, not the day before', async () => {
      expect(new Date().getTimezoneOffset()).not.toBe(0); // else nothing to catch

      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(classRepository, 'save')
        .mockImplementation(async (entity) => buildSavedResponse(entity));
      jest
        .spyOn(bookingRepository, 'countBookedBookings')
        .mockResolvedValue(0);
      const saveSpy = jest.spyOn(classRepository, 'save');

      const newDay = '2026-08-21';
      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        undefined,
        undefined,
        newDay,
      );

      const result = await handler.execute(command);

      const entityPassedToSave = saveSpy.mock.calls[0][0];
      expect(
        DateUtils.mixedDateToDateString(entityPassedToSave.scheduledDate),
      ).toBe(newDay);
      expect(entityPassedToSave.scheduledDate).toBe(newDay);
      expect(result.scheduledDate).toBe(newDay);
    });

    it('should update classTypeId when a valid classType belonging to the gym is provided', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

      const newClassTypeId = 'ct-new';
      jest
        .spyOn(classTypeService, 'getClassTypeById')
        .mockResolvedValue({ id: newClassTypeId, gymId: mockGymId } as any);

      const savedEntity = buildSavedResponse({ ...cls, classTypeId: newClassTypeId });
      jest.spyOn(classRepository, 'save').mockResolvedValue(savedEntity);
      jest.spyOn(bookingRepository, 'countBookedBookings').mockResolvedValue(0);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        newClassTypeId,
      );

      await handler.execute(command);

      const entityPassedToSave = (classRepository.save as jest.Mock).mock.calls[0][0];
      expect(entityPassedToSave.classTypeId).toBe(newClassTypeId);
    });

    it('should update coachUserId when a valid active coach is provided', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

      const newCoachId = 'coach-new';
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValue({ role: 'coach', status: 'active' } as any);

      const savedEntity = buildSavedResponse({ ...cls, coachUserId: newCoachId });
      jest.spyOn(classRepository, 'save').mockResolvedValue(savedEntity);
      jest.spyOn(bookingRepository, 'countBookedBookings').mockResolvedValue(0);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        newCoachId,
      );

      await handler.execute(command);

      const entityPassedToSave = (classRepository.save as jest.Mock).mock.calls[0][0];
      expect(entityPassedToSave.coachUserId).toBe(newCoachId);
    });

    it('should update spaceId when a valid space belonging to the gym is provided', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);

      const newSpaceId = 'space-new';
      jest
        .spyOn(spaceService, 'getSpaceById')
        .mockResolvedValue({ id: newSpaceId, gymId: mockGymId } as any);

      const savedEntity = buildSavedResponse({ ...cls, spaceId: newSpaceId });
      jest.spyOn(classRepository, 'save').mockResolvedValue(savedEntity);
      jest.spyOn(bookingRepository, 'countBookedBookings').mockResolvedValue(0);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        undefined,
        newSpaceId,
      );

      await handler.execute(command);

      const entityPassedToSave = (classRepository.save as jest.Mock).mock.calls[0][0];
      expect(entityPassedToSave.spaceId).toBe(newSpaceId);
    });
  });

  describe('empty patch body', () => {
    it('should succeed without changing any fields when no patch fields are provided', async () => {
      const cls = buildPublishedClass();
      const originalClassTypeId = cls.classTypeId;
      const originalCoachUserId = cls.coachUserId;
      const originalSpaceId = cls.spaceId;
      const originalCapacity = cls.capacity;

      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      const savedEntity = buildSavedResponse(cls);
      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue(savedEntity);
      jest
        .spyOn(bookingRepository, 'countBookedBookings')
        .mockResolvedValue(0);

      const command = new EditClassCommand(mockGymId, mockClassId);

      const result = await handler.execute(command);

      expect(saveSpy).toHaveBeenCalledTimes(1);
      const entityPassedToSave = saveSpy.mock.calls[0][0];
      expect(entityPassedToSave.classTypeId).toBe(originalClassTypeId);
      expect(entityPassedToSave.coachUserId).toBe(originalCoachUserId);
      expect(entityPassedToSave.spaceId).toBe(originalSpaceId);
      expect(entityPassedToSave.capacity).toBe(originalCapacity);
      expect(result).toBeDefined();
    });
  });

  describe('field validation guards', () => {
    it('should throw NotFoundException when classTypeId does not exist', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue(null);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        'non-existent-ct',
      );

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when classType belongs to a different gym', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(classTypeService, 'getClassTypeById')
        .mockResolvedValue({ id: 'ct-other', gymId: 'other-gym' } as any);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        'ct-other',
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when coachUserId is not a member of the gym', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValue(null);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        'unknown-coach',
      );

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should accept an active owner as the assigned coach', async () => {
      // Owners coach their own classes (DECISIONS.md, "Owners as Coaches").
      // This previously threw — it was the rule that dead-ended a new gym.
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValue({ role: 'owner', status: 'active' } as any);
      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue(cls);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        'owner-user-id',
      );

      await handler.execute(command);

      expect(saveSpy.mock.calls[0][0].coachUserId).toBe('owner-user-id');
    });

    it('should throw BadRequestException when the staff member is an athlete', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValue({ role: 'athlete', status: 'active' } as any);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        'athlete-user-id',
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when coach is not active', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValue({ role: 'coach', status: 'inactive' } as any);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        'inactive-coach',
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when spaceId does not exist', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest.spyOn(spaceService, 'getSpaceById').mockResolvedValue(null);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        undefined,
        'non-existent-space',
      );

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when space belongs to a different gym', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(spaceService, 'getSpaceById')
        .mockResolvedValue({ id: 'space-other', gymId: 'other-gym' } as any);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        undefined,
        'space-other',
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when new capacity is less than current booked count', async () => {
      const cls = buildPublishedClass();
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(cls);
      jest
        .spyOn(bookingRepository, 'countBookedBookings')
        .mockResolvedValue(10);

      const command = new EditClassCommand(
        mockGymId,
        mockClassId,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        5,
      );

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    });
  });
});
