import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateGymHandler } from './create-gym.handler';
import { CreateGymCommand } from '../create-gym.command';
import { GymEntity } from '../../../domain/gym/entities/gym.entity';
import { GymStaffEntity } from '../../../domain/gym-staff/entities/gym-staff.entity';
import { UserService } from '../../../domain/user/user.service';
import { AuthService } from '../../../domain/auth/auth.service';

describe('CreateGymHandler', () => {
  let handler: CreateGymHandler;
  let gymRepository: { save: jest.Mock };
  let gymStaffRepository: { save: jest.Mock; findOne: jest.Mock };
  let userService: { getUserById: jest.Mock };
  let authService: { issueTokenForUser: jest.Mock };

  const mockUserId = 'user-123';
  const command = new CreateGymCommand(
    mockUserId,
    'CrossFit Downtown',
    'Rua das Flores 123',
    'A premium gym.',
  );

  beforeEach(async () => {
    gymRepository = {
      save: jest
        .fn()
        .mockImplementation((gym: GymEntity) =>
          Promise.resolve({ ...gym, createdAt: new Date('2026-01-01') }),
        ),
    };
    gymStaffRepository = {
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      findOne: jest.fn().mockResolvedValue(null),
    };
    userService = {
      getUserById: jest.fn().mockResolvedValue({ id: mockUserId }),
    };
    authService = {
      issueTokenForUser: jest.fn().mockResolvedValue('fresh.jwt.token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateGymHandler,
        { provide: getRepositoryToken(GymEntity), useValue: gymRepository },
        {
          provide: getRepositoryToken(GymStaffEntity),
          useValue: gymStaffRepository,
        },
        { provide: UserService, useValue: userService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    handler = module.get<CreateGymHandler>(CreateGymHandler);
  });

  it('should throw NotFoundException when the authenticated user is gone', async () => {
    userService.getUserById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(gymRepository.save).not.toHaveBeenCalled();
  });

  // One gym per owner: a token carries a single gymId, so a second owned gym
  // makes the owner's login context arbitrary.
  it('should throw ConflictException when the user already owns an active gym', async () => {
    gymStaffRepository.findOne.mockResolvedValue({
      id: 'staff-1',
      gymId: 'gym-1',
      userId: mockUserId,
      role: 'owner',
      status: 'active',
    });

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
  });

  it('should not save a gym or staff entry when ownership already exists', async () => {
    // Rejecting after the gym save would leave an orphan gym with no owner.
    gymStaffRepository.findOne.mockResolvedValue({ role: 'owner' });

    await expect(handler.execute(command)).rejects.toThrow(ConflictException);
    expect(gymRepository.save).not.toHaveBeenCalled();
    expect(gymStaffRepository.save).not.toHaveBeenCalled();
  });

  it('should look for active owner staffing only', async () => {
    // A coach may staff several gyms, and inactive rows are historical, so
    // neither should block a first gym of one's own.
    await handler.execute(command);

    expect(gymStaffRepository.findOne).toHaveBeenCalledWith({
      where: { userId: mockUserId, role: 'owner', status: 'active' },
    });
  });

  // Auto-approval is what makes onboarding work at all: every configuration
  // command rejects a non-active gym, and nothing can approve one yet.
  it('should create the gym as active, not pending_approval', async () => {
    await handler.execute(command);

    const saved = gymRepository.save.mock.calls[0][0] as GymEntity;
    expect(saved.status).toBe('active');
  });

  it('should register the creating user as the gym owner', async () => {
    await handler.execute(command);

    const staff = gymStaffRepository.save.mock.calls[0][0] as GymStaffEntity;
    expect(staff.userId).toBe(mockUserId);
    expect(staff.role).toBe('owner');
    expect(staff.status).toBe('active');
  });

  // The caller's token was signed before this gym existed, so it claims
  // gymId: null and GymOwnershipGuard would reject the wizard's next request.
  it('should return a re-signed token for the caller', async () => {
    const result = await handler.execute(command);

    expect(authService.issueTokenForUser).toHaveBeenCalledWith(mockUserId);
    expect(result.accessToken).toBe('fresh.jwt.token');
  });

  it('should issue the token only after the owner staff entry is saved', async () => {
    // Ordering matters: issueTokenForUser re-resolves claims from gym_staff, so
    // minting before the save would hand back a token still claiming no gym.
    const order: string[] = [];
    gymStaffRepository.save.mockImplementation((e) => {
      order.push('staff-save');
      return Promise.resolve(e);
    });
    authService.issueTokenForUser.mockImplementation(() => {
      order.push('issue-token');
      return Promise.resolve('fresh.jwt.token');
    });

    await handler.execute(command);

    expect(order).toEqual(['staff-save', 'issue-token']);
  });
});
