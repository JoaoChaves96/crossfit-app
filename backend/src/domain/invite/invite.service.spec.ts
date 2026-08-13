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

describe('InviteService — accepting by role', () => {
  let service: InviteService;
  let inviteRepo: { findOne: jest.Mock; update: jest.Mock; save: jest.Mock; find: jest.Mock };
  let membershipRepo: { findOne: jest.Mock };
  let staffFindOne: jest.Mock;
  let saved: Array<{ entity: unknown; row: Record<string, unknown> }>;
  let issueTokenForUser: jest.Mock;

  const GYM_ID = 'gym-1';
  const USER = { id: 'user-7', email: 'dana@example.com' };

  function pendingInvite(role: 'athlete' | 'coach') {
    return {
      id: 'inv-1',
      gymId: GYM_ID,
      inviteeEmail: USER.email,
      inviteToken: 'tok-abc',
      role,
      status: 'pending',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdByUserId: 'owner-1',
    };
  }

  beforeEach(async () => {
    saved = [];
    inviteRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      save: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
    };
    membershipRepo = { findOne: jest.fn().mockResolvedValue(null) };
    staffFindOne = jest.fn().mockResolvedValue(null);
    issueTokenForUser = jest.fn().mockResolvedValue('re-signed.jwt.token');

    const manager = {
      save: jest.fn((entity: unknown, row: Record<string, unknown>) => {
        saved.push({ entity, row });
        return Promise.resolve(row);
      }),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(USER),
    };

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === GymEntity) return { findOne: jest.fn().mockResolvedValue({ id: GYM_ID, name: 'Box One', location: 'Lisbon' }) };
        if (entity === UserEntity) return { findOne: jest.fn().mockResolvedValue(USER) };
        if (entity === GymStaffEntity) return { findOne: staffFindOne };
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
      transaction: jest.fn((cb: (m: typeof manager) => Promise<unknown>) => cb(manager)),
      manager: { findOne: jest.fn().mockResolvedValue(USER) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: getRepositoryToken(InviteEntity), useValue: inviteRepo },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: membershipRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AuthService, useValue: { issueTokenForUser } },
      ],
    }).compile();

    service = module.get(InviteService);
  });

  it('creates a gym_staff row for a coach invite, not a membership', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));

    const result = await service.acceptInvite('tok-abc', USER.id);

    const entities = saved.map((s) => s.entity);
    expect(entities).toContain(GymStaffEntity);
    expect(entities).not.toContain(GymMembershipEntity);

    const staffRow = saved.find((s) => s.entity === GymStaffEntity)!.row;
    expect(staffRow).toMatchObject({ gymId: GYM_ID, userId: USER.id, role: 'coach', status: 'active' });
    expect(result.role).toBe('coach');
  });

  it('still creates a membership for an athlete invite', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('athlete'));

    const result = await service.acceptInvite('tok-abc', USER.id);

    const entities = saved.map((s) => s.entity);
    expect(entities).toContain(GymMembershipEntity);
    expect(entities).not.toContain(GymStaffEntity);
    expect(result.role).toBe('athlete');
  });

  it('returns a re-signed token so the new context is usable without re-login', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));

    const result = await service.acceptInvite('tok-abc', USER.id);

    expect(issueTokenForUser).toHaveBeenCalledWith(USER.id);
    expect(result.token).toBe('re-signed.jwt.token');
  });

  it('refuses a coach invite when the invitee is already staff at that gym', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));
    staffFindOne.mockResolvedValue({ id: 'staff-1', gymId: GYM_ID, userId: USER.id, status: 'active' });

    await expect(service.acceptInvite('tok-abc', USER.id)).rejects.toThrow(CoachAlreadyStaffError);
    expect(saved).toHaveLength(0);
  });

  it('filters the invite list by role when asked', async () => {
    await service.listInvites(GYM_ID, 'coach');

    expect(inviteRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gymId: GYM_ID, role: 'coach' } }),
    );
  });

  it('lists every invite when no role filter is given', async () => {
    await service.listInvites(GYM_ID);

    expect(inviteRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { gymId: GYM_ID } }),
    );
  });
});
