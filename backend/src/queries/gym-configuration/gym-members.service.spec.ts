import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { GymMembersQueryService } from './gym-members.service';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

function buildMembership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gm-1',
    userId: 'user-1',
    gymId: 'gym-1',
    status: 'active',
    joinedAt: new Date('2026-01-15T10:00:00.000Z'),
    user: { name: 'Jane Doe', email: 'jane@example.com' },
    ...overrides,
  } as unknown as GymMembershipEntity;
}

function buildActivePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: 'amp-1',
    gymMembershipId: 'gm-1',
    membershipPlanId: 'plan-1',
    membershipPlan: { id: 'plan-1', name: 'Unlimited' },
    status: 'active',
    expiresAt: null,
    autoRoll: true,
    autoRollCount: 0,
    ...overrides,
  } as unknown as AthleteMembershipPlanEntity;
}

describe('GymMembersQueryService', () => {
  let service: GymMembersQueryService;
  const membershipFind = jest.fn();
  const planFind = jest.fn();

  beforeEach(async () => {
    membershipFind.mockReset();
    planFind.mockReset();
    planFind.mockResolvedValue([]);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        GymMembersQueryService,
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { find: membershipFind },
        },
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { find: planFind },
        },
      ],
    }).compile();

    service = moduleRef.get(GymMembersQueryService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lists every member of the gym, suspended ones included', async () => {
    membershipFind.mockResolvedValue([]);

    await service.getMembersByGym('gym-1');

    expect(membershipFind).toHaveBeenCalledWith({
      where: { gymId: 'gym-1' },
      relations: ['user'],
      order: { joinedAt: 'DESC' },
    });
  });

  it('loads only active plan rows, never the unfiltered relation', async () => {
    membershipFind.mockResolvedValue([
      buildMembership(),
      buildMembership({ id: 'gm-2', userId: 'user-2' }),
    ]);

    await service.getMembersByGym('gym-1');

    expect(planFind).toHaveBeenCalledWith({
      where: { status: 'active', gymMembershipId: In(['gm-1', 'gm-2']) },
      relations: ['membershipPlan'],
    });
  });

  it('reports an unlimited plan as active and maps every new field', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([buildActivePlan({ autoRollCount: 3 })]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0]).toEqual({
      id: 'gm-1',
      userId: 'user-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      status: 'active',
      joinedAt: new Date('2026-01-15T10:00:00.000Z'),
      planId: 'plan-1',
      planName: 'Unlimited',
      expiresAt: null,
      membershipStatus: 'active',
      autoRoll: true,
      autoRollCount: 3,
    });
  });

  it('reports a plan expiring inside seven days as expiring', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([
      buildActivePlan({ expiresAt: new Date('2026-08-16T10:00:00.000Z') }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('expiring');
    expect(result.members[0].expiresAt).toEqual(
      new Date('2026-08-16T10:00:00.000Z'),
    );
  });

  it('reports a plan expiring beyond seven days as active', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([
      buildActivePlan({ expiresAt: new Date('2026-09-01T10:00:00.000Z') }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('active');
  });

  it('reports a past expiry as expired even while the row still says active', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([
      buildActivePlan({
        expiresAt: new Date('2026-08-01T10:00:00.000Z'),
        autoRoll: false,
      }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('expired');
  });

  it('reports a member with no active plan as expired with null plan fields', async () => {
    membershipFind.mockResolvedValue([buildMembership()]);
    planFind.mockResolvedValue([]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0]).toMatchObject({
      planId: null,
      planName: null,
      expiresAt: null,
      membershipStatus: 'expired',
      autoRoll: false,
      autoRollCount: 0,
    });
  });

  it('reports a suspended member as inactive even with a healthy plan', async () => {
    membershipFind.mockResolvedValue([buildMembership({ status: 'inactive' })]);
    planFind.mockResolvedValue([buildActivePlan()]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].membershipStatus).toBe('inactive');
    expect(result.members[0].status).toBe('inactive');
  });

  it('matches each plan to its own member', async () => {
    membershipFind.mockResolvedValue([
      buildMembership(),
      buildMembership({ id: 'gm-2', userId: 'user-2' }),
    ]);
    planFind.mockResolvedValue([
      buildActivePlan({
        gymMembershipId: 'gm-2',
        membershipPlanId: 'plan-2',
        membershipPlan: { id: 'plan-2', name: 'Basic' },
      }),
    ]);

    const result = await service.getMembersByGym('gym-1');

    expect(result.members[0].planName).toBeNull();
    expect(result.members[1].planName).toBe('Basic');
  });

  it('skips the plan query entirely when the gym has no members', async () => {
    membershipFind.mockResolvedValue([]);

    const result = await service.getMembersByGym('gym-1');

    expect(planFind).not.toHaveBeenCalled();
    expect(result).toEqual({ members: [] });
  });
});
