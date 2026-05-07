import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { InviteCoachHandler } from './invite-coach.handler';
import { InviteCoachCommand } from '../invite-coach.command';
import { GymService } from '../../../domain/gym/gym.service';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymStaffEntity } from '../../../domain/gym-staff/entities/gym-staff.entity';
import { UserEntity } from '../../../domain/user/entities/user.entity';

describe('InviteCoachHandler', () => {
  let handler: InviteCoachHandler;
  let gymService: GymService;
  let gymStaffService: GymStaffService;

  const mockOwnerId = 'owner-user-123';
  const mockGymId = 'gym-123';
  const mockCoachEmail = 'newcoach@example.com';

  const baseCommand = new InviteCoachCommand(mockOwnerId, mockGymId, mockCoachEmail);

  const activeGym = { id: mockGymId, status: 'active' };

  // Helpers to build mocked EntityManager repositories
  function buildMockManager(overrides: {
    userFindOne?: jest.Mock;
    userSave?: jest.Mock;
    gymStaffFindOne?: jest.Mock;
    gymStaffSave?: jest.Mock;
  }) {
    const userFindOne = overrides.userFindOne ?? jest.fn().mockResolvedValue(null);
    const userSave = overrides.userSave ?? jest.fn().mockImplementation((e) => Promise.resolve({ ...e, id: 'new-user-id' }));
    const gymStaffFindOne = overrides.gymStaffFindOne ?? jest.fn().mockResolvedValue(null);
    const gymStaffSave =
      overrides.gymStaffSave ??
      jest.fn().mockImplementation((e: GymStaffEntity) =>
        Promise.resolve({ ...e, id: e.id ?? 'new-staff-id', assignedAt: new Date() }),
      );

    return {
      getRepository: jest.fn((entity) => {
        if (entity === UserEntity) {
          return { findOne: userFindOne, save: userSave };
        }
        if (entity === GymStaffEntity) {
          return { findOne: gymStaffFindOne, save: gymStaffSave };
        }
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
    };
  }

  function setupDataSource(managerOverrides: Parameters<typeof buildMockManager>[0]) {
    const mockManager = buildMockManager(managerOverrides);
    return {
      transaction: jest.fn().mockImplementation((cb: (manager: typeof mockManager) => Promise<unknown>) =>
        cb(mockManager as any),
      ),
    };
  }

  async function buildModule(dataSourceValue: object): Promise<void> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteCoachHandler,
        {
          provide: GymService,
          useValue: { getGymById: jest.fn() },
        },
        {
          provide: GymStaffService,
          useValue: { isGymOwner: jest.fn() },
        },
        {
          provide: getDataSourceToken(),
          useValue: dataSourceValue,
        },
      ],
    }).compile();

    handler = module.get<InviteCoachHandler>(InviteCoachHandler);
    gymService = module.get<GymService>(GymService);
    gymStaffService = module.get<GymStaffService>(GymStaffService);
  }

  describe('execute', () => {
    it('should throw ForbiddenException when caller is not a gym owner', async () => {
      const dataSource = setupDataSource({});
      await buildModule(dataSource);

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(false);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue(activeGym as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when gym does not exist', async () => {
      const dataSource = setupDataSource({});
      await buildModule(dataSource);

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue(null);

      await expect(handler.execute(baseCommand)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when gym is not active', async () => {
      const dataSource = setupDataSource({});
      await buildModule(dataSource);

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue({ id: mockGymId, status: 'suspended' } as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when email already has a gym staff record in this gym', async () => {
      const existingUser: Partial<UserEntity> = {
        id: 'existing-user-id',
        email: mockCoachEmail,
        status: 'active',
      };

      const existingStaff: Partial<GymStaffEntity> = {
        id: 'existing-staff-id',
        userId: 'existing-user-id',
        gymId: mockGymId,
        role: 'coach',
        status: 'active',
      };

      const dataSource = setupDataSource({
        userFindOne: jest.fn().mockResolvedValue(existingUser),
        gymStaffFindOne: jest.fn().mockResolvedValue(existingStaff),
      });
      await buildModule(dataSource);

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue(activeGym as any);

      await expect(handler.execute(baseCommand)).rejects.toThrow(BadRequestException);
    });

    it('should create membership without creating a new user when email belongs to an existing user', async () => {
      const existingUser: Partial<UserEntity> = {
        id: 'existing-user-id',
        email: mockCoachEmail,
        status: 'active',
      };

      const userFindOne = jest.fn().mockResolvedValue(existingUser);
      const userSave = jest.fn();
      const gymStaffFindOne = jest.fn().mockResolvedValue(null);
      const gymStaffSave = jest.fn().mockImplementation((e: GymStaffEntity) =>
        Promise.resolve({ ...e, id: e.id, assignedAt: new Date() }),
      );

      const dataSource = setupDataSource({ userFindOne, userSave, gymStaffFindOne, gymStaffSave });
      await buildModule(dataSource);

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue(activeGym as any);

      const result = await handler.execute(baseCommand);

      expect(userSave).not.toHaveBeenCalled();
      expect(gymStaffSave).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.gymId).toBe(mockGymId);
      expect(result.userId).toBe('existing-user-id');
      expect(result.role).toBe('coach');
      expect(result.status).toBe('active');
    });

    it('should create a new user and membership when email is brand new', async () => {
      const userFindOne = jest.fn().mockResolvedValue(null);
      const userSave = jest.fn().mockImplementation((e: Partial<UserEntity>) =>
        Promise.resolve({ ...e, id: 'brand-new-user-id' }),
      );
      const gymStaffFindOne = jest.fn().mockResolvedValue(null);
      const gymStaffSave = jest.fn().mockImplementation((e: GymStaffEntity) =>
        Promise.resolve({ ...e, id: e.id, assignedAt: new Date() }),
      );

      const dataSource = setupDataSource({ userFindOne, userSave, gymStaffFindOne, gymStaffSave });
      await buildModule(dataSource);

      jest.spyOn(gymStaffService, 'isGymOwner').mockResolvedValue(true);
      jest.spyOn(gymService, 'getGymById').mockResolvedValue(activeGym as any);

      const result = await handler.execute(baseCommand);

      expect(userSave).toHaveBeenCalledTimes(1);
      const createdUser = userSave.mock.calls[0][0] as UserEntity;
      expect(createdUser.email).toBe(mockCoachEmail);
      expect(createdUser.status).toBe('pending');
      expect(createdUser.passwordHash).toBeTruthy();

      expect(gymStaffSave).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
      expect(result.gymId).toBe(mockGymId);
      expect(result.userId).toBe('brand-new-user-id');
      expect(result.role).toBe('coach');
      expect(result.status).toBe('active');
    });
  });
});
