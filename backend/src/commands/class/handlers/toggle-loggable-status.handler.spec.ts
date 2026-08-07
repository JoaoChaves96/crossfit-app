import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ToggleLoggableStatusHandler } from './toggle-loggable-status.handler';
import { ToggleLoggableStatusCommand } from '../toggle-loggable-status.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { ClassContentAccessService } from '../../../domain/class/class-content-access.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ClassEntity } from '../../../domain/class/entities/class.entity';

describe('ToggleLoggableStatusHandler', () => {
  let handler: ToggleLoggableStatusHandler;
  let classRepository: ClassRepository;
  let gymStaffService: GymStaffService;

  const mockCoachUserId = 'coach-user-123';
  const mockOwnerUserId = 'owner-user-123';
  const mockClassId = 'class-123';
  const mockGymId = 'gym-123';

  const coachCommand = new ToggleLoggableStatusCommand(
    mockCoachUserId,
    mockClassId,
    mockGymId,
  );
  const ownerCommand = new ToggleLoggableStatusCommand(
    mockOwnerUserId,
    mockClassId,
    mockGymId,
  );

  const publishedClass = () =>
    ({
      id: mockClassId,
      gymId: mockGymId,
      classTypeId: 'class-type-1',
      coachUserId: mockCoachUserId,
      spaceId: 'space-1',
      scheduledDate: '2026-01-10',
      scheduledTime: '09:00:00',
      capacity: 20,
      loggable: false,
      state: 'published',
      createdAt: new Date(),
      lastModifiedAt: new Date(),
    }) as unknown as ClassEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToggleLoggableStatusHandler,
        ClassContentAccessService,
        {
          provide: ClassRepository,
          useValue: {
            getClassById: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: GymStaffService,
          useValue: {
            isGymOwner: jest.fn().mockResolvedValue(false),
            isCoach: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    handler = module.get<ToggleLoggableStatusHandler>(
      ToggleLoggableStatusHandler,
    );
    classRepository = module.get<ClassRepository>(ClassRepository);
    gymStaffService = module.get<GymStaffService>(GymStaffService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should throw NotFoundException when the class is not found in the gym', async () => {
    jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

    await expect(handler.execute(coachCommand)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should scope the class lookup by gymId', async () => {
    const getSpy = jest
      .spyOn(classRepository, 'getClassById')
      .mockResolvedValue(publishedClass());
    jest
      .spyOn(classRepository, 'save')
      .mockImplementation((c: ClassEntity) => Promise.resolve(c));

    await handler.execute(coachCommand);

    expect(getSpy).toHaveBeenCalledWith(mockClassId, mockGymId);
  });

  it('should allow the assigned coach to toggle loggable', async () => {
    jest
      .spyOn(classRepository, 'getClassById')
      .mockResolvedValue(publishedClass());
    jest
      .spyOn(classRepository, 'save')
      .mockImplementation((c: ClassEntity) => Promise.resolve(c));

    const result = await handler.execute(coachCommand);

    expect(result.loggable).toBe(true);
  });

  it('should allow the gym owner to toggle loggable on a class they do not coach', async () => {
    jest
      .spyOn(classRepository, 'getClassById')
      .mockResolvedValue(publishedClass());
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
    jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(false);
    jest
      .spyOn(classRepository, 'save')
      .mockImplementation((c: ClassEntity) => Promise.resolve(c));

    const result = await handler.execute(ownerCommand);

    expect(result.loggable).toBe(true);
  });

  it('should throw ForbiddenException when a coach is not assigned to the class', async () => {
    jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
      ...publishedClass(),
      coachUserId: 'another-coach-id',
    } as ClassEntity);
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
    jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(true);

    await expect(handler.execute(coachCommand)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when the caller belongs to another gym', async () => {
    jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
      ...publishedClass(),
      coachUserId: 'another-coach-id',
    } as ClassEntity);
    jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
    jest.spyOn(gymStaffService, 'isCoach').mockResolvedValue(false);

    const foreignCommand = new ToggleLoggableStatusCommand(
      'other-gym-user-999',
      mockClassId,
      mockGymId,
    );

    await expect(handler.execute(foreignCommand)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when the class belongs to a different gym', async () => {
    jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
      ...publishedClass(),
      gymId: 'different-gym-id',
    } as ClassEntity);

    await expect(handler.execute(coachCommand)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it.each(['in_progress', 'completed', 'archived'])(
    'should throw BadRequestException for the gym owner when class state is %s',
    async (state) => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        ...publishedClass(),
        state,
      } as ClassEntity);
      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);

      await expect(handler.execute(ownerCommand)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it.each(['in_progress', 'completed', 'archived'])(
    'should throw BadRequestException for the assigned coach when class state is %s',
    async (state) => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
        ...publishedClass(),
        state,
      } as ClassEntity);

      await expect(handler.execute(coachCommand)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('should allow toggling while the class is booking_closed', async () => {
    jest.spyOn(classRepository, 'getClassById').mockResolvedValue({
      ...publishedClass(),
      state: 'booking_closed',
    } as ClassEntity);
    jest
      .spyOn(classRepository, 'save')
      .mockImplementation((c: ClassEntity) => Promise.resolve(c));

    const result = await handler.execute(coachCommand);

    expect(result.loggable).toBe(true);
  });
});
