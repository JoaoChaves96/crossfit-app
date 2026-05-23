import { Test, TestingModule } from '@nestjs/testing';
import { ManuallyTransitionClassStateHandler } from './manually-transition-class-state.handler';
import { ManuallyTransitionClassStateCommand } from '../manually-transition-class-state.command';
import { ClassRepository } from '../../../repositories/class.repository';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { ClassEntity } from '../../../domain/class/entities/class.entity';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

describe('ManuallyTransitionClassStateHandler', () => {
  let handler: ManuallyTransitionClassStateHandler;
  let classRepository: ClassRepository;
  let gymStaffService: GymStaffService;

  const mockGymId = 'gym-123';
  const mockClassId = 'class-123';
  const mockUserId = 'coach-123';

  function buildClassEntity(
    state: ClassEntity['state'],
  ): ClassEntity {
    return {
      id: mockClassId,
      gymId: mockGymId,
      classTypeId: 'ct-123',
      coachUserId: mockUserId,
      spaceId: 'space-123',
      scheduledDate: new Date(),
      scheduledTime: '10:00',
      capacity: 20,
      duration: 60,
      loggable: true,
      state,
      createdAt: new Date(),
      lastModifiedAt: new Date(),
      deletedAt: null,
    } as ClassEntity;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManuallyTransitionClassStateHandler,
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
            isCoachAssignedToClass: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<ManuallyTransitionClassStateHandler>(
      ManuallyTransitionClassStateHandler,
    );
    classRepository = module.get<ClassRepository>(ClassRepository);
    gymStaffService = module.get<GymStaffService>(GymStaffService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('class not found', () => {
    it('should throw NotFoundException when class does not exist', async () => {
      jest.spyOn(classRepository, 'getClassById').mockResolvedValue(null);

      const command = new ManuallyTransitionClassStateCommand(
        mockUserId,
        mockClassId,
        mockGymId,
        'booking_closed',
      );

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('valid state transitions', () => {
    const validTransitions: Array<{
      from: ClassEntity['state'];
      to: ClassEntity['state'];
    }> = [
      { from: 'published', to: 'booking_closed' },
      { from: 'booking_closed', to: 'in_progress' },
      { from: 'in_progress', to: 'completed' },
      { from: 'completed', to: 'archived' },
    ];

    it.each(validTransitions)(
      'should transition from $from to $to and save the new state',
      async ({ from, to }) => {
        const classEntity = buildClassEntity(from);
        jest
          .spyOn(classRepository, 'getClassById')
          .mockResolvedValue(classEntity);
        jest
          .spyOn(gymStaffService, 'isCoachAssignedToClass')
          .mockResolvedValue(true);

        const savedEntity = { ...classEntity, state: to };
        const saveSpy = jest
          .spyOn(classRepository, 'save')
          .mockResolvedValue(savedEntity as ClassEntity);

        const command = new ManuallyTransitionClassStateCommand(
          mockUserId,
          mockClassId,
          mockGymId,
          to,
        );

        const result = await handler.execute(command);

        expect(result.state).toBe(to);
        expect(saveSpy).toHaveBeenCalledTimes(1);
        const entityPassedToSave = saveSpy.mock.calls[0][0];
        expect(entityPassedToSave.state).toBe(to);
        expect(entityPassedToSave.lastModifiedAt).toBeInstanceOf(Date);
      },
    );
  });

  describe('invalid state transitions — wrong order', () => {
    const invalidTransitions: Array<{
      from: ClassEntity['state'];
      to: ClassEntity['state'];
    }> = [
      { from: 'published', to: 'in_progress' },
      { from: 'published', to: 'completed' },
      { from: 'published', to: 'archived' },
      { from: 'booking_closed', to: 'published' },
      { from: 'booking_closed', to: 'completed' },
      { from: 'in_progress', to: 'published' },
      { from: 'in_progress', to: 'booking_closed' },
      { from: 'completed', to: 'published' },
      { from: 'completed', to: 'in_progress' },
    ];

    it.each(invalidTransitions)(
      'should throw BadRequestException for invalid transition from $from to $to',
      async ({ from, to }) => {
        const classEntity = buildClassEntity(from);
        jest
          .spyOn(classRepository, 'getClassById')
          .mockResolvedValue(classEntity);
        jest
          .spyOn(gymStaffService, 'isCoachAssignedToClass')
          .mockResolvedValue(true);

        const command = new ManuallyTransitionClassStateCommand(
          mockUserId,
          mockClassId,
          mockGymId,
          to,
        );

        await expect(handler.execute(command)).rejects.toThrow(
          BadRequestException,
        );
      },
    );
  });

  describe('transitioning from archived (terminal state)', () => {
    it('should throw BadRequestException for any transition out of archived', async () => {
      const classEntity = buildClassEntity('archived');
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(classEntity);
      jest
        .spyOn(gymStaffService, 'isCoachAssignedToClass')
        .mockResolvedValue(true);

      // archived has no valid next state; trying to transition to any state is invalid.
      // The state machine only allows index+1, and archived is the last index.
      const command = new ManuallyTransitionClassStateCommand(
        mockUserId,
        mockClassId,
        mockGymId,
        'published',
      );

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when attempting self-transition on archived', async () => {
      const classEntity = buildClassEntity('archived');
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(classEntity);
      jest
        .spyOn(gymStaffService, 'isCoachAssignedToClass')
        .mockResolvedValue(true);

      const command = new ManuallyTransitionClassStateCommand(
        mockUserId,
        mockClassId,
        mockGymId,
        'archived',
      );

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('authorization guards', () => {
    it('should throw ForbiddenException when userId does not match coachUserId on the class', async () => {
      const classEntity = buildClassEntity('published');
      classEntity.coachUserId = 'different-coach';
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(classEntity);

      const command = new ManuallyTransitionClassStateCommand(
        mockUserId,
        mockClassId,
        mockGymId,
        'booking_closed',
      );

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when coach is not active in the gym', async () => {
      const classEntity = buildClassEntity('published');
      jest
        .spyOn(classRepository, 'getClassById')
        .mockResolvedValue(classEntity);
      jest
        .spyOn(gymStaffService, 'isCoachAssignedToClass')
        .mockResolvedValue(false);

      const command = new ManuallyTransitionClassStateCommand(
        mockUserId,
        mockClassId,
        mockGymId,
        'booking_closed',
      );

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    });
  });
});
