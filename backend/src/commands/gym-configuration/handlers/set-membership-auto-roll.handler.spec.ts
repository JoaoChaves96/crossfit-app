import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SetMembershipAutoRollHandler } from './set-membership-auto-roll.handler';
import { SetMembershipAutoRollCommand } from '../set-membership-auto-roll.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

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
    autoRollCount: 5,
    ...overrides,
  } as unknown as AthleteMembershipPlanEntity;
}

describe('SetMembershipAutoRollHandler', () => {
  let handler: SetMembershipAutoRollHandler;
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        SetMembershipAutoRollHandler,
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

    handler = moduleRef.get(SetMembershipAutoRollHandler);
  });

  function command(autoRoll: boolean) {
    return new SetMembershipAutoRollCommand('owner-1', 'gym-1', 'gm-1', autoRoll);
  }

  it('turns auto-renew off and leaves the renewal count alone', async () => {
    const row = buildPlanRow();
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command(false));

    expect(row.autoRoll).toBe(false);
    expect(row.autoRollCount).toBe(5);
    expect(planSave).toHaveBeenCalledWith(row);
    expect(result).toEqual({
      id: 'amp-1',
      gymMembershipId: 'gm-1',
      membershipPlanId: 'plan-1',
      planName: 'Unlimited',
      status: 'active',
      startedAt: new Date('2026-07-01T00:00:00.000Z'),
      expiresAt: new Date('2026-09-01T00:00:00.000Z'),
      autoRoll: false,
      autoRollCount: 5,
    });
  });

  it('resets the renewal count when auto-renew is turned back on', async () => {
    const row = buildPlanRow({ autoRoll: false, autoRollCount: 5 });
    planFindOne.mockResolvedValue(row);

    const result = await handler.execute(command(true));

    expect(result.autoRoll).toBe(true);
    expect(result.autoRollCount).toBe(0);
  });

  it('403s when the caller is not an owner of the gym', async () => {
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command(false))).rejects.toThrow(
      ForbiddenException,
    );
    expect(planSave).not.toHaveBeenCalled();
  });

  it('404s when the membership does not exist', async () => {
    membershipFindOne.mockResolvedValue(null);

    await expect(handler.execute(command(false))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('403s when the membership belongs to another gym', async () => {
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'other-gym',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);

    await expect(handler.execute(command(false))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('404s when the member has no active plan', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(handler.execute(command(false))).rejects.toThrow(
      NotFoundException,
    );
    expect(planFindOne).toHaveBeenCalledWith({
      where: { gymMembershipId: 'gm-1', status: 'active' },
      relations: ['membershipPlan'],
    });
  });
});
