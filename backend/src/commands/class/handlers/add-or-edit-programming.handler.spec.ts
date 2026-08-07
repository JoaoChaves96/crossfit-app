import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AddOrEditProgrammingHandler } from './add-or-edit-programming.handler';
import { AddOrEditProgrammingCommand } from '../add-or-edit-programming.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { ProgrammingRepository } from '../../../repositories/programming.repository';
import { ClassContentAccessService } from '../../../domain/class/class-content-access.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ProgrammingEntity } from '../../../domain/programming/entities/programming.entity';

describe('AddOrEditProgrammingHandler', () => {
  let handler: AddOrEditProgrammingHandler;
  let classRepository: ClassRepository;
  let programmingRepository: ProgrammingRepository;
  let gymStaffService: GymStaffService;

  const mockUserId = 'coach-user-123';
  const mockOwnerUserId = 'owner-user-123';
  const mockClassId = 'class-123';
  const mockGymId = 'gym-123';
  const mockContent = 'Today: 5x5 Back Squat at 80%';

  const baseCommand = new AddOrEditProgrammingCommand(
    mockUserId,
    mockClassId,
    mockGymId,
    mockContent,
  );

  const publishedClassEntity = {
    id: mockClassId,
    gymId: mockGymId,
    state: 'published',
    coachUserId: mockUserId,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddOrEditProgrammingHandler,
        {
          provide: ClassRepository,
          useValue: {
            getClassById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ProgrammingRepository,
          useValue: {
            getProgrammingByClassId: jest.fn(),
            save: jest.fn(),
          },
        },
        ClassContentAccessService,
        {
          provide: GymStaffService,
          useValue: {
            isGymOwner: jest.fn().mockResolvedValue(false),
            isCoach: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    handler = module.get<AddOrEditProgrammingHandler>(
      AddOrEditProgrammingHandler,
    );
    classRepository = module.get<ClassRepository>(ClassRepository);
    programmingRepository = module.get<ProgrammingRepository>(
      ProgrammingRepository,
    );
    gymStaffService = module.get<GymStaffService>(GymStaffService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw NotFoundException when class is not found', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

      await expect(handler.execute(baseCommand)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when class does not belong to the specified gym', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        gymId: 'different-gym-id',
        state: 'published',
        coachUserId: mockUserId,
      } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when a coach is not assigned to the class', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        gymId: mockGymId,
        state: 'published',
        coachUserId: 'another-coach-id',
      } as any);
      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(true);

      await expect(handler.execute(baseCommand)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException when the caller belongs to another gym (not owner, not the assigned coach)', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        gymId: mockGymId,
        state: 'published',
        coachUserId: 'another-coach-id',
      } as any);
      // Foreign user is neither owner nor coach of this gym
      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(false);

      const foreignCommand = new AddOrEditProgrammingCommand(
        'other-gym-user-999',
        mockClassId,
        mockGymId,
        mockContent,
      );

      await expect(handler.execute(foreignCommand)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow the gym owner to add programming to a class they do not coach', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        gymId: mockGymId,
        state: 'published',
        coachUserId: mockUserId, // owner is NOT the assigned coach
      } as any);
      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(false);
      jest
        .spyOn(programmingRepository, 'getProgrammingByClassId')
        .mockResolvedValue(null);

      const ownerCommand = new AddOrEditProgrammingCommand(
        mockOwnerUserId,
        mockClassId,
        mockGymId,
        mockContent,
      );

      const saveSpy = jest
        .spyOn(programmingRepository, 'save')
        .mockImplementation((entity: ProgrammingEntity) =>
          Promise.resolve(entity),
        );

      const result = await handler.execute(ownerCommand);

      expect(result.classId).toBe(mockClassId);
      expect(result.content).toBe(mockContent);
      expect(result.createdByUserId).toBe(mockOwnerUserId);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it.each(['in_progress', 'completed', 'archived'])(
      'should throw BadRequestException for the gym owner when class state is %s',
      async (state) => {
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          id: mockClassId,
          gymId: mockGymId,
          state,
          coachUserId: mockUserId,
        } as any);
        jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);

        const ownerCommand = new AddOrEditProgrammingCommand(
          mockOwnerUserId,
          mockClassId,
          mockGymId,
          mockContent,
        );

        await expect(handler.execute(ownerCommand)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it.each(['in_progress', 'completed', 'archived'])(
      'should throw BadRequestException for the assigned coach when class state is %s',
      async (state) => {
        jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
          ...publishedClassEntity,
          state,
        } as any);
        jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
        jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(true);

        await expect(handler.execute(baseCommand)).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it('should throw ForbiddenException when coach is not active in gym', async () => {
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(publishedClassEntity as any);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(false);

      await expect(handler.execute(baseCommand)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when class state is not published or booking_closed', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        ...publishedClassEntity,
        state: 'completed',
      } as any);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(true);

      await expect(handler.execute(baseCommand)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create new programming when none exists for the class', async () => {
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(publishedClassEntity as any);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(true);
      jest
        .spyOn(programmingRepository, 'getProgrammingByClassId')
        .mockResolvedValue(null);

      const savedProgramming: ProgrammingEntity = {
        id: 'new-programming-id',
        classId: mockClassId,
        content: mockContent,
        createdByUserId: mockUserId,
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        lastModifiedByUserId: null,
      } as ProgrammingEntity;

      const saveSpy = jest
        .spyOn(programmingRepository, 'save')
        .mockResolvedValue(savedProgramming);

      const result = await handler.execute(baseCommand);

      expect(result).toBeDefined();
      expect(result.classId).toBe(mockClassId);
      expect(result.content).toBe(mockContent);
      expect(result.createdByUserId).toBe(mockUserId);
      expect(saveSpy).toHaveBeenCalledTimes(1);

      const savedEntity = saveSpy.mock.calls[0][0];
      expect(savedEntity.id).toBeTruthy();
      expect(savedEntity.classId).toBe(mockClassId);
      expect(savedEntity.createdByUserId).toBe(mockUserId);
      expect(savedEntity.lastModifiedByUserId).toBeNull();
    });

    it('should update existing programming when it already exists', async () => {
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(publishedClassEntity as any);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(true);

      const existingProgramming: ProgrammingEntity = {
        id: 'existing-programming-id',
        classId: mockClassId,
        content: 'Old content',
        createdByUserId: mockUserId,
        createdAt: new Date('2024-01-01'),
        lastModifiedAt: new Date('2024-01-01'),
        lastModifiedByUserId: null,
      } as ProgrammingEntity;

      jest
        .spyOn(programmingRepository, 'getProgrammingByClassId')
        .mockResolvedValue(existingProgramming);

      const updatedProgramming: ProgrammingEntity = {
        ...existingProgramming,
        content: mockContent,
        lastModifiedByUserId: mockUserId,
        lastModifiedAt: new Date(),
      } as ProgrammingEntity;

      const saveSpy = jest
        .spyOn(programmingRepository, 'save')
        .mockResolvedValue(updatedProgramming);

      const result = await handler.execute(baseCommand);

      expect(result).toBeDefined();
      expect(result.content).toBe(mockContent);
      expect(result.lastModifiedByUserId).toBe(mockUserId);
      expect(saveSpy).toHaveBeenCalledTimes(1);

      const savedEntity = saveSpy.mock.calls[0][0];
      expect(savedEntity.id).toBe('existing-programming-id');
      expect(savedEntity.content).toBe(mockContent);
      expect(savedEntity.lastModifiedByUserId).toBe(mockUserId);
    });

    it('should allow programming on a class with state booking_closed', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        ...publishedClassEntity,
        state: 'booking_closed',
      } as any);
      jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(true);
      jest
        .spyOn(programmingRepository, 'getProgrammingByClassId')
        .mockResolvedValue(null);

      const savedProgramming: ProgrammingEntity = {
        id: 'new-programming-id',
        classId: mockClassId,
        content: mockContent,
        createdByUserId: mockUserId,
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        lastModifiedByUserId: null,
      } as ProgrammingEntity;

      jest
        .spyOn(programmingRepository, 'save')
        .mockResolvedValue(savedProgramming);

      const result = await handler.execute(baseCommand);

      expect(result).toBeDefined();
      expect(result.classId).toBe(mockClassId);
    });
  });
});
