import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { InviteService } from './invite.service';
import { InviteEntity } from './entities/invite.entity';
import { GymEntity } from '../gym/entities/gym.entity';
import { UserEntity } from '../user/entities/user.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../gym-membership/entities/gym-membership.entity';
import { AuthService } from '../auth/auth.service';
import {
  CoachAlreadyStaffError,
  CoachInvitePendingError,
  GymSuspendedError,
  InviteNotForCallerError,
} from './invite.errors';

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
        { provide: AuthService, useValue: { issueTokenForGym: jest.fn() } },
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
    inviteRepo.find.mockResolvedValue([{ id: 'inv-1', status: 'pending', expiresAt: future }]);

    await expect(service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach')).rejects.toThrow(
      CoachInvitePendingError,
    );
    expect(inviteRepo.save).not.toHaveBeenCalled();
  });

  it('allows a new coach invite when the previous one has expired', async () => {
    const past = new Date(Date.now() - 86_400_000);
    inviteRepo.find.mockResolvedValue([{ id: 'inv-1', status: 'pending', expiresAt: past }]);

    const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

    expect(result.role).toBe('coach');
    expect(inviteRepo.save).toHaveBeenCalledTimes(1);
  });

  // The expired row is returned first, so a check that looks at only one row
  // lands on it and lets a second live invite through.
  it('rejects when any pending row is still live, not just the first one found', async () => {
    inviteRepo.find.mockResolvedValue([
      { id: 'inv-old', status: 'pending', expiresAt: new Date(Date.now() - 86_400_000) },
      { id: 'inv-live', status: 'pending', expiresAt: new Date(Date.now() + 86_400_000) },
    ]);

    await expect(service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach')).rejects.toThrow(
      CoachInvitePendingError,
    );
    expect(inviteRepo.save).not.toHaveBeenCalled();
  });

  it('does not apply coach preconditions to athlete invites', async () => {
    userFindOne.mockResolvedValue({ id: 'user-9', email: 'athlete@example.com' });
    staffFindOne.mockResolvedValue({ id: 'staff-9', gymId: GYM_ID, userId: 'user-9', status: 'active' });

    const result = await service.createInvite(GYM_ID, OWNER_ID, 'athlete@example.com');

    expect(result.role).toBe('athlete');
  });

  describe('FRONTEND_URL', () => {
    const originalFrontendUrl = process.env.FRONTEND_URL;

    afterEach(() => {
      if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
      else process.env.FRONTEND_URL = originalFrontendUrl;
    });

    it('falls back to localhost, never to a domain we do not own', async () => {
      delete process.env.FRONTEND_URL;

      const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

      expect(result.inviteLink).toMatch(/^http:\/\/localhost:8081\/invite\//);
      expect(result.inviteLink).not.toContain('crossfitbox.com');
    });

    it('uses FRONTEND_URL when it is set', async () => {
      process.env.FRONTEND_URL = 'https://app.boxops.dev';

      const result = await service.createInvite(GYM_ID, OWNER_ID, EMAIL, 'coach');

      expect(result.inviteLink).toMatch(/^https:\/\/app\.boxops\.dev\/invite\//);
    });

    it('gives list items the same link the create response built', async () => {
      process.env.FRONTEND_URL = 'https://app.boxops.dev';
      inviteRepo.find.mockResolvedValue([
        {
          id: 'inv-1',
          inviteeEmail: EMAIL,
          inviteToken: 'tok-abc',
          role: 'coach',
          status: 'pending',
          createdAt: new Date('2026-08-14T10:00:00.000Z'),
          expiresAt: new Date('2026-08-21T10:00:00.000Z'),
          acceptedAt: null,
        },
      ]);

      const [item] = await service.listInvites(GYM_ID, 'coach');

      expect(item.inviteLink).toBe('https://app.boxops.dev/invite/tok-abc');
    });
  });
});

describe('InviteService — accepting by role', () => {
  let service: InviteService;
  let inviteRepo: { findOne: jest.Mock; update: jest.Mock; save: jest.Mock; find: jest.Mock };
  let membershipRepo: { findOne: jest.Mock };
  let staffFindOne: jest.Mock;
  let saved: Array<{ entity: unknown; row: Record<string, unknown> }>;
  let issueTokenForGym: jest.Mock;
  let managerFindUser: jest.Mock;
  let transactionMock: jest.Mock;
  let gymFindOne: jest.Mock;

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
    issueTokenForGym = jest.fn().mockResolvedValue('re-signed.jwt.token');
    managerFindUser = jest.fn().mockResolvedValue(USER);
    gymFindOne = jest.fn().mockResolvedValue({
      id: GYM_ID,
      name: 'Box One',
      location: 'Lisbon',
      status: 'active',
    });

    const manager = {
      save: jest.fn((entity: unknown, row: Record<string, unknown>) => {
        saved.push({ entity, row });
        return Promise.resolve(row);
      }),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn().mockResolvedValue(USER),
    };

    transactionMock = jest.fn((cb: (m: typeof manager) => Promise<unknown>) => cb(manager));

    const dataSource = {
      getRepository: jest.fn((entity: unknown) => {
        if (entity === GymEntity) return { findOne: gymFindOne };
        if (entity === UserEntity) return { findOne: jest.fn().mockResolvedValue(USER) };
        if (entity === GymStaffEntity) return { findOne: staffFindOne };
        throw new Error(`Unexpected entity: ${String(entity)}`);
      }),
      transaction: transactionMock,
      manager: { findOne: managerFindUser },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InviteService,
        { provide: getRepositoryToken(InviteEntity), useValue: inviteRepo },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: membershipRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: AuthService, useValue: { issueTokenForGym } },
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

  it('re-signs the token for the gym just accepted, not the caller default', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));

    const result = await service.acceptInvite('tok-abc', USER.id);

    // Naming the gym is the whole point: a coach already staffed elsewhere would
    // otherwise be handed a token for their oldest gym while the client stores
    // this one.
    expect(issueTokenForGym).toHaveBeenCalledWith(USER.id, GYM_ID);
    expect(result.token).toBe('re-signed.jwt.token');
  });

  it('mints the token only after the attachment row is committed', async () => {
    // issueTokenForGym resolves the caller role from gym_staff/gym_membership,
    // so signing before the transaction commits would throw Forbidden.
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));

    await service.acceptInvite('tok-abc', USER.id);

    expect(transactionMock.mock.invocationCallOrder[0]).toBeLessThan(
      issueTokenForGym.mock.invocationCallOrder[0],
    );
  });

  it('refuses a caller whose account is not the invited address, with no token and no write', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));
    managerFindUser.mockResolvedValue({ id: 'attacker-1', email: 'someone.else@example.com' });

    await expect(service.acceptInvite('tok-abc', 'attacker-1')).rejects.toThrow(
      InviteNotForCallerError,
    );
    expect(saved).toHaveLength(0);
    expect(issueTokenForGym).not.toHaveBeenCalled();
  });

  it('accepts when the account email differs from the invite only by case', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));
    managerFindUser.mockResolvedValue({ id: USER.id, email: USER.email.toUpperCase() });

    const result = await service.acceptInvite('tok-abc', USER.id);

    expect(result.role).toBe('coach');
  });

  // The mirror of the case above. Both sides are folded, and only pinning one
  // direction leaves the other side's `.toLowerCase()` free to be deleted: an
  // invite stored with capitals (typed that way by whoever sent it) against a
  // lower-case account is the same person too.
  it('accepts when the invite address differs from the account only by case', async () => {
    inviteRepo.findOne.mockResolvedValue({
      ...pendingInvite('coach'),
      inviteeEmail: USER.email.toUpperCase(),
    });
    managerFindUser.mockResolvedValue({ id: USER.id, email: USER.email });

    const result = await service.acceptInvite('tok-abc', USER.id);

    expect(result.role).toBe('coach');
  });

  it('refuses an unidentified caller rather than resolving one', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));

    await expect(service.acceptInvite('tok-abc', '')).rejects.toThrow(
      InviteNotForCallerError,
    );
    expect(managerFindUser).not.toHaveBeenCalled();
    expect(saved).toHaveLength(0);
  });

  it('refuses a coach invite when the invitee is already staff at that gym', async () => {
    inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));
    staffFindOne.mockResolvedValue({ id: 'staff-1', gymId: GYM_ID, userId: USER.id, status: 'active' });

    await expect(service.acceptInvite('tok-abc', USER.id)).rejects.toThrow(CoachAlreadyStaffError);
    expect(saved).toHaveLength(0);
  });

  // GymStatusGuard freezes mutations on `:gymId` routes, but this one takes its
  // gym from the invite token, so the guard never sees a gym to check. Joining a
  // frozen gym is a mutation like any other and the check lives here.
  it.each(['suspended', 'pending_approval'])(
    'refuses acceptance into a %s gym, attaching nobody',
    async (status) => {
      inviteRepo.findOne.mockResolvedValue(pendingInvite('coach'));
      gymFindOne.mockResolvedValue({ id: GYM_ID, name: 'Box One', status });

      await expect(service.acceptInvite('tok-abc', USER.id)).rejects.toThrow(
        GymSuspendedError,
      );
      expect(saved).toHaveLength(0);
      expect(transactionMock).not.toHaveBeenCalled();
      expect(issueTokenForGym).not.toHaveBeenCalled();
    },
  );

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
