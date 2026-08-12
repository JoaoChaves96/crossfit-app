import { Test, TestingModule } from '@nestjs/testing';
import { CreateClassHandler } from './create-class.handler';
import { CreateClassCommand } from '../create-class.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { SpaceService } from '../../../domain/space/space.service';
import { ClassTypeService } from '../../../domain/class-type/class-type.service';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DateUtils } from 'typeorm/util/DateUtils';

/**
 * A bare 'YYYY-MM-DD' calendar day N days from today, which is the shape
 * CreateClassCommand carries. Computed from the clock rather than hardcoded so
 * the "must be in the future" precondition cannot rot.
 */
const dayFromToday = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

describe('CreateClassHandler', () => {
  let handler: CreateClassHandler;
  let classRepository: ClassRepository;
  let gymService: GymService;
  let gymStaffService: GymStaffService;
  let spaceService: SpaceService;
  let classTypeService: ClassTypeService;

  const mockGymId = 'gym-123';
  const mockUserId = 'user-123';
  const mockCoachUserId = 'coach-123';
  const mockClassTypeId = 'class-type-123';
  const mockSpaceId = 'space-123';
  const futureDate = dayFromToday(7);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateClassHandler,
        {
          provide: ClassRepository,
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: GymService,
          useValue: {
            getGymById: jest.fn(),
          },
        },
        {
          provide: GymStaffService,
          useValue: {
            isGymOwner: jest.fn(),
            getGymStaffByUserAndGym: jest.fn(),
          },
        },
        {
          provide: SpaceService,
          useValue: {
            getSpaceById: jest.fn(),
          },
        },
        {
          provide: ClassTypeService,
          useValue: {
            getClassTypeById: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CreateClassHandler>(CreateClassHandler);
    classRepository = module.get<ClassRepository>(ClassRepository);
    gymService = module.get<GymService>(GymService);
    gymStaffService = module.get<GymStaffService>(GymStaffService);
    spaceService = module.get<SpaceService>(SpaceService);
    classTypeService = module.get<ClassTypeService>(ClassTypeService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should create a class when all preconditions are met', async () => {
      // Arrange
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
        20,
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValueOnce(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValueOnce({
        id: mockGymId,
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValueOnce({
        id: mockClassTypeId,
        gymId: mockGymId,
      } as any);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValueOnce({
          role: 'coach',
          status: 'active',
        } as any);
      jest.spyOn(spaceService, 'getSpaceById').mockResolvedValueOnce({
        id: mockSpaceId,
        gymId: mockGymId,
        baseCapacity: 30,
      } as any);

      const mockSavedClass = {
        id: 'class-uuid-123',
        gymId: mockGymId,
        classTypeId: mockClassTypeId,
        coachUserId: mockCoachUserId,
        spaceId: mockSpaceId,
        capacity: 20,
        state: 'published',
        // `@Column('date')` hydrates as a bare 'YYYY-MM-DD' string, never a Date.
        scheduledDate: futureDate as unknown as Date,
        createdAt: new Date(),
        lastModifiedAt: new Date(),
      } as ClassEntity;

      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue(mockSavedClass);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(result.state).toBe('published');
      expect(result.capacity).toBe(20);
      expect(saveSpy).toHaveBeenCalled();

      // Verify the entity passed to save has correct initial state
      const saveCall = saveSpy.mock.calls[0];
      const savedEntity = saveCall[0];
      expect(savedEntity.state).toBe('published');
      expect(savedEntity.createdAt).toBeInstanceOf(Date);
      expect(savedEntity.lastModifiedAt).toBeInstanceOf(Date);
      expect(savedEntity.id).toBeTruthy(); // UUID was generated
    });

    /**
     * Asserts on what gets PERSISTED, not on what a later read returns — the read
     * paths are faithful now and would happily report a wrong stored day.
     *
     * `@Column('date')` values go through `DateUtils.mixedDateToDateString` on the
     * way to the column, and that reads LOCAL getters. So handing the entity a
     * `Date` built from a bare day (UTC midnight) persists the PREVIOUS day
     * anywhere west of UTC: the owner books Friday and the row says Thursday.
     * Running that same function here is the closest a unit test gets to the
     * column. The zone is pinned to America/New_York — see test/jest-tz.setup.ts.
     */
    it('persists the calendar day the owner asked for, not the day before', async () => {
      expect(new Date().getTimezoneOffset()).not.toBe(0); // else nothing to catch

      const day = dayFromToday(7);
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        day,
        '10:00',
        20,
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest
        .spyOn(gymService, 'getGymById')
        .mockResolvedValue({ id: mockGymId, status: 'active' } as any);
      jest
        .spyOn(classTypeService, 'getClassTypeById')
        .mockResolvedValue({ id: mockClassTypeId, gymId: mockGymId } as any);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValue({ role: 'coach', status: 'active' } as any);
      jest
        .spyOn(spaceService, 'getSpaceById')
        .mockResolvedValue({ gymId: mockGymId, baseCapacity: 30 } as any);

      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockImplementation(async (entity) => entity as ClassEntity);

      await handler.execute(command);

      const savedEntity = saveSpy.mock.calls[0][0];
      expect(DateUtils.mixedDateToDateString(savedEntity.scheduledDate)).toBe(
        day,
      );
      // Stored as the bare day, which is also how the column hydrates back.
      expect(savedEntity.scheduledDate).toBe(day);
    });

    it('should throw ForbiddenException if user is not gym owner', async () => {
      // Arrange
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if gym not found', async () => {
      // Arrange
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if gym is suspended', async () => {
      // Arrange
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'suspended',
      } as any);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if scheduled time is in the past', async () => {
      // Arrange
      const pastDate = dayFromToday(-1);

      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        pastDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue({
        gymId: mockGymId,
      } as any);
      jest.spyOn(gymStaffService, 'getGymStaffByUserAndGym').mockResolvedValue({
        role: 'coach',
        status: 'active',
      } as any);
      jest.spyOn(spaceService, 'getSpaceById').mockResolvedValue({
        gymId: mockGymId,
      } as any);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use space.baseCapacity if capacity is not provided', async () => {
      // Arrange
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
        // No capacity provided
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValueOnce(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValueOnce({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValueOnce({
        gymId: mockGymId,
      } as any);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValueOnce({
          role: 'coach',
          status: 'active',
        } as any);
      jest.spyOn(spaceService, 'getSpaceById').mockResolvedValueOnce({
        gymId: mockGymId,
        baseCapacity: 25,
      } as any);

      const mockSavedClass = {
        capacity: 25,
        scheduledDate: futureDate as unknown as Date,
      } as ClassEntity;
      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue(mockSavedClass);

      // Act
      await handler.execute(command);

      // Assert
      const saveCall = saveSpy.mock.calls[0];
      const savedEntity = saveCall[0];
      expect(savedEntity.capacity).toBe(25);
    });

    it('should throw NotFoundException if class type not found', async () => {
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if class type belongs to different gym', async () => {
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue({
        gymId: 'different-gym',
      } as any);

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept an active owner as the assigned coach', async () => {
      // A solo box owner coaches their own classes (DECISIONS.md, "Owners as
      // Coaches"): a brand-new gym has no coach row, so requiring role='coach'
      // here left the owner unable to schedule anything at all.
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue({
        gymId: mockGymId,
      } as any);
      jest.spyOn(gymStaffService, 'getGymStaffByUserAndGym').mockResolvedValue({
        role: 'owner',
        status: 'active',
      } as any);
      jest.spyOn(spaceService, 'getSpaceById').mockResolvedValue({
        gymId: mockGymId,
        baseCapacity: 30,
      } as any);
      const saveSpy = jest
        .spyOn(classRepository, 'save')
        .mockResolvedValue({
          id: 'class-uuid-123',
          scheduledDate: futureDate as unknown as Date,
        } as ClassEntity);

      await handler.execute(command);

      expect(saveSpy.mock.calls[0][0].coachUserId).toBe(mockUserId);
    });

    it('should throw BadRequestException if the owner staff row is inactive', async () => {
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue({
        gymId: mockGymId,
      } as any);
      jest.spyOn(gymStaffService, 'getGymStaffByUserAndGym').mockResolvedValue({
        role: 'owner',
        status: 'inactive',
      } as any);

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if coach not found', async () => {
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue({
        gymId: mockGymId,
      } as any);
      jest
        .spyOn(gymStaffService, 'getGymStaffByUserAndGym')
        .mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if space not found', async () => {
      const command = new CreateClassCommand(
        mockUserId,
        mockGymId,
        mockClassTypeId,
        mockCoachUserId,
        mockSpaceId,
        futureDate,
        '10:00',
      );

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({
        status: 'active',
      } as any);
      jest.spyOn(classTypeService, 'getClassTypeById').mockResolvedValue({
        gymId: mockGymId,
      } as any);
      jest.spyOn(gymStaffService, 'getGymStaffByUserAndGym').mockResolvedValue({
        role: 'coach',
        status: 'active',
      } as any);
      jest.spyOn(spaceService, 'getSpaceById').mockResolvedValue(null);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });
});
