import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AddOrEditProgrammingHandler } from './add-or-edit-programming.handler';
import { AddOrEditProgrammingCommand } from '../add-or-edit-programming.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { ProgrammingRepository } from '../../../repositories/programming.repository';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ProgrammingEntity } from '../../../domain/programming/entities/programming.entity';

describe('AddOrEditProgrammingHandler', () => {
  let handler: AddOrEditProgrammingHandler;
  let classRepository: ClassRepository;
  let programmingRepository: ProgrammingRepository;
  let gymStaffService: GymStaffService;

  const mockUserId = 'coach-user-123';
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
        {
          provide: GymStaffService,
          useValue: {
            isCoachAssignedToClass: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<AddOrEditProgrammingHandler>(AddOrEditProgrammingHandler);
    classRepository = module.get<ClassRepository>(ClassRepository);
    programmingRepository = module.get<ProgrammingRepository>(ProgrammingRepository);
    gymStaffService = module.get<GymStaffService>(GymStaffService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw NotFoundException when class is not found', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

      await expect(handler.execute(baseCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when class does not belong to the specified gym', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        gymId: 'different-gym-id',
        state: 'published',
        coachUserId: mockUserId,
      } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when caller is not the assigned coach', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        id: mockClassId,
        gymId: mockGymId,
        state: 'published',
        coachUserId: 'another-coach-id',
      } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when coach is not active in gym', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(publishedClassEntity as any);
      jest.spyOn(gymStaffService, 'isCoachAssignedToClass').mockResolvedValue(false);

      await expect(handler.execute(baseCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when class state is not published or booking_closed', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        ...publishedClassEntity,
        state: 'completed',
      } as any);
      jest.spyOn(gymStaffService, 'isCoachAssignedToClass').mockResolvedValue(true);

      await expect(handler.execute(baseCommand)).rejects.toThrow(BadRequestException);
    });

    it('should create new programming when none exists for the class', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(publishedClassEntity as any);
      jest.spyOn(gymStaffService, 'isCoachAssignedToClass').mockResolvedValue(true);
      jest.spyOn(programmingRepository, 'getProgrammingByClassId').mockResolvedValue(null);

      const savedProgramming: ProgrammingEntity = {
        id: 'new-programming-id',
        classId: mockClassId,
        content: mockContent,
        createdByUserId: mockUserId,
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        lastModifiedByUserId: null,
      } as ProgrammingEntity;

      const saveSpy = jest.spyOn(programmingRepository, 'save').mockResolvedValue(savedProgramming);

      const result = await handler.execute(baseCommand);

      expect(result).toBeDefined();
      expect(result.classId).toBe(mockClassId);
      expect(result.content).toBe(mockContent);
      expect(result.createdByUserId).toBe(mockUserId);
      expect(saveSpy).toHaveBeenCalledTimes(1);

      const savedEntity = saveSpy.mock.calls[0][0] as ProgrammingEntity;
      expect(savedEntity.id).toBeTruthy();
      expect(savedEntity.classId).toBe(mockClassId);
      expect(savedEntity.createdByUserId).toBe(mockUserId);
      expect(savedEntity.lastModifiedByUserId).toBeNull();
    });

    it('should update existing programming when it already exists', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(publishedClassEntity as any);
      jest.spyOn(gymStaffService, 'isCoachAssignedToClass').mockResolvedValue(true);

      const existingProgramming: ProgrammingEntity = {
        id: 'existing-programming-id',
        classId: mockClassId,
        content: 'Old content',
        createdByUserId: mockUserId,
        createdAt: new Date('2024-01-01'),
        lastModifiedAt: new Date('2024-01-01'),
        lastModifiedByUserId: null,
      } as ProgrammingEntity;

      jest.spyOn(programmingRepository, 'getProgrammingByClassId').mockResolvedValue(existingProgramming);

      const updatedProgramming: ProgrammingEntity = {
        ...existingProgramming,
        content: mockContent,
        lastModifiedByUserId: mockUserId,
        lastModifiedAt: new Date(),
      } as ProgrammingEntity;

      const saveSpy = jest.spyOn(programmingRepository, 'save').mockResolvedValue(updatedProgramming);

      const result = await handler.execute(baseCommand);

      expect(result).toBeDefined();
      expect(result.content).toBe(mockContent);
      expect(result.lastModifiedByUserId).toBe(mockUserId);
      expect(saveSpy).toHaveBeenCalledTimes(1);

      const savedEntity = saveSpy.mock.calls[0][0] as ProgrammingEntity;
      expect(savedEntity.id).toBe('existing-programming-id');
      expect(savedEntity.content).toBe(mockContent);
      expect(savedEntity.lastModifiedByUserId).toBe(mockUserId);
    });

    it('should allow programming on a class with state booking_closed', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        ...publishedClassEntity,
        state: 'booking_closed',
      } as any);
      jest.spyOn(gymStaffService, 'isCoachAssignedToClass').mockResolvedValue(true);
      jest.spyOn(programmingRepository, 'getProgrammingByClassId').mockResolvedValue(null);

      const savedProgramming: ProgrammingEntity = {
        id: 'new-programming-id',
        classId: mockClassId,
        content: mockContent,
        createdByUserId: mockUserId,
        createdAt: new Date(),
        lastModifiedAt: new Date(),
        lastModifiedByUserId: null,
      } as ProgrammingEntity;

      jest.spyOn(programmingRepository, 'save').mockResolvedValue(savedProgramming);

      const result = await handler.execute(baseCommand);

      expect(result).toBeDefined();
      expect(result.classId).toBe(mockClassId);
    });
  });
});
