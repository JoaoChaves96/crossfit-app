import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { InviteService } from './invite.service';
import { InviteEntity } from './entities/invite.entity';
import { GymEntity } from '../gym/entities/gym.entity';
import { UserEntity } from '../user/entities/user.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../gym-membership/entities/gym-membership.entity';
import { AuthService } from '../auth/auth.service';
import { CoachAlreadyStaffError, CoachInvitePendingError } from './invite.errors';

const GYM_ID = 'gym-1';
const OWNER_ID = 'owner-1';
const EMAIL = 'newcoach@example.com';

describe('InviteService — coach invites', () => {
  let service: InviteService;
  let inviteRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock; update: jest.Mock };
  let userFindOne: jest.Mock;
  let staffFindOne: jest.Mock;

  beforeEach(async () => {
    inviteRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      update: jest.fn().mockResolvedValue(undefined),
    };
    userFindOne = jest.fn().mockResolvedValue(null);
    staffFindOne = jest.fn().mockResolvedValue(null);

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === GymEntity) {
          return { findOne: jest.fn().mockResolvedValue({ id: GYM_ID, name: 'Box One', location: 'Lisbon' }) };
        }
        if (entity === UserEntity) return { findOne: userFindOne };
        if (entity === GymStaffEntity) return { findOne: staffFindOne };
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
      transaction: jest.fn(),
      manager: { findOne: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: getRepositoryToken(InviteEntity), useValue: inviteRepo },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: { findOne: jest.fn() } },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AuthService, useValue: { issueTokenForUser: jest.fn() } },
      ],
    }).compile();

    service = module.get(InviteService);
  });

  it('defaults to an athlete invite when no role is given', async () => {
    const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

    expect(result.role).toBe('athlete');
    expect((inviteRepo.save.mock.calls[0][0] as InviteEntity).role).toBe('athlete');
  });

  it('persists role=coach and returns it', async () => {
    const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

    expect(result.role).toBe('coach');
    expect((inviteRepo.save.mock.calls[0][0] as InviteEntity).role).toBe('coach');
    expect(result.inviteLink).toContain(`/invite/${result.inviteToken}`);
  });

  it('rejects a coach invite when the email already has a gym_staff row at this gym', async () => {
    userFindOne.mockResolvedValue({ id: 'user-9', email: EMAIL });
    staffFindOne.mockResolvedValue({ id: 'staff-9', gymId: GYM_ID, userId: 'user-9', status: 'inactive' });

    await expect(service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach')).rejects.toThrow(
      CoachAlreadyStaffError,
    );
    expect(inviteRepo.save).not.toHaveBeenCalled();
  });

  it('rejects a second pending coach invite for the same gym and email', async () => {
    const future = new Date(Date.now() + 86_400_000);
    inviteRepo.findOne.mockResolvedValue({ id: 'inv-1', status: 'pending', expiresAt: future });

    await expect(service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach')).rejects.toThrow(
      CoachInvitePendingError,
    );
    expect(inviteRepo.save).not.toHaveBeenCalled();
  });

  it('allows a new coach invite when the previous one has expired', async () => {
    const past = new Date(Date.now() - 86_400_000);
    inviteRepo.findOne.mockResolvedValue({ id: 'inv-1', status: 'pending', expiresAt: past });

    const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

    expect(result.role).toBe('coach');
    expect(inviteRepo.save).toHaveBeenCalledTimes(1);
  });

  it('does not apply coach preconditions to athlete invites', async () => {
    userFindOne.mockResolvedValue({ id: 'user-9', email: 'athlete@example.com' });
    staffFindOne.mockResolvedValue({ id: 'staff-9', gymId: GYM_ID, userId: 'user-9', status: 'active' });

    const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

    expect(result.role).toBe('athlete');
  });
});
