import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExtendMembershipHandler } from './extend-membership.handler';
import { ExtendMembershipCommand } from '../extend-membership.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

const NOW = new Date('2026-08-11T10:00:00.000Z');
const FUTURE = new Date('2026-10-01T00:00:00.000Z');

function buildPlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'amp-1',
    gymMembershipId: 'gm-1',
    membershipPlanId: 'plan-1',
    membershipPlan: { id: 'plan-1', name: 'Unlimited' },
    status: 'active',
    startedAt: new Date('2026-07-01T00:00:00.000Z'),
    expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    autoRoll: true,
    autoRollCount: 2,
    ...overrides,
  } as unknown as AthleteMembershipPlanEntity;
}

describe('ExtendMembershipHandler', () => {
  let handler: ExtendMembershipHandler;
  const isGymOwner = jest.fn();
  const membershipFindOne = jest.fn();
  const planFindOne = jest.fn();
  const planSave = jest.fn();

  beforeEach(async () => {
    [isGymOwner, membershipFindOne, planFindOne, planSave].forEach((m) =>
      m.mockReset(),
    );
    isGymOwner.mockResolvedValue(true);
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'gym-1',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);
    planSave.mockImplementation((entity) => Promise.resolve(entity));
    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExtendMembershipHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { findOne: membershipFindOne },
        },
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { findOne: planFindOne, save: planSave },
        },
      ],
    }).compile();

    handler = moduleRef.get(ExtendMembershipHandler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function command(expiresAt: Date = FUTURE) {
    return new ExtendMembershipCommand('owner-1', 'gym-1', 'gm-1', expiresAt);
  }

  it('pushes the expiry to the requested date and returns the plan', async () => {
    const row = buildPlanRow();
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(row.expiresAt).toEqual(FUTURE);
    expect(row.status).toBe('active');
    expect(planSave).toHaveBeenCalledWith(row);
    expect(result).toEqual({
      id: 'amp-1',
      gymMembershipId: 'gm-1',
      membershipPlanId: 'plan-1',
      planName: 'Unlimited',
      status: 'active',
      startedAt: new Date('2026-07-01T00:00:00.000Z'),
      expiresAt: FUTURE,
      autoRoll: true,
      autoRollCount: 0,
    });
  });

  it('clears the unconfirmed-renewal count, because extending is a confirmation', async () => {
    const row = buildPlanRow({ autoRollCount: 5 });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(row.autoRollCount).toBe(0);
    expect(result.autoRollCount).toBe(0);
  });

  it('revives an expired plan', async () => {
    const row = buildPlanRow({
      status: 'expired',
      expiresAt: new Date('2026-07-01T00:00:00.000Z'),
    });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(row.status).toBe('active');
    expect(result.status).toBe('active');
    expect(result.expiresAt).toEqual(FUTURE);
  });

  it('extends an unlimited plan by pinning it to the requested date', async () => {
    const row = buildPlanRow({ expiresAt: null });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command());

    expect(result.expiresAt).toEqual(FUTURE);
  });

  it('rejects an expiry date in the past', async () => {
    planFindOne.mockResolvedValue(buildPlanRow());

    await expect(
      handler.execute(command(new Date('2026-08-01T00:00:00.000Z'))),
    ).rejects.toThrow(BadRequestException);
    expect(planSave).not.toHaveBeenCalled();
  });

  it('rejects an expiry date that is not a real date', async () => {
    planFindOne.mockResolvedValue(buildPlanRow());

    await expect(handler.execute(command(new Date('nonsense')))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('404s when the membership does not exist', async () => {
    membershipFindOne.mockResolvedValue(null);

    await expect(handler.execute(command())).rejects.toThrow(NotFoundException);
  });

  it('403s when the membership belongs to another gym', async () => {
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'other-gym',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);

    await expect(handler.execute(command())).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('403s when the caller is not an owner of the gym', async () => {
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command())).rejects.toThrow(
      ForbiddenException,
    );
    expect(planFindOne).not.toHaveBeenCalled();
  });

  it('404s when the member has no membership plan at all', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(handler.execute(command())).rejects.toThrow(NotFoundException);
  });
});
