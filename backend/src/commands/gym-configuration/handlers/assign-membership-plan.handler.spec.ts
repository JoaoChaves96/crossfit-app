import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AssignMembershipPlanHandler } from './assign-membership-plan.handler';
import { AssignMembershipPlanCommand } from '../assign-membership-plan.command';
import { GymStaffService } from '../../../domain/gym-staff/gym-staff.service';
import { GymMembershipEntity } from '../../../domain/gym-membership/entities/gym-membership.entity';
import { MembershipPlanEntity } from '../../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

const NOW = new Date('2026-08-11T10:00:00.000Z');

describe('AssignMembershipPlanHandler', () => {
  let handler: AssignMembershipPlanHandler;
  const isGymOwner = jest.fn();
  const membershipFindOne = jest.fn();
  const planFindOne = jest.fn();
  const managerUpdate = jest.fn();
  const managerSave = jest.fn();
  const transaction = jest.fn();

  beforeEach(async () => {
    [
      isGymOwner,
      membershipFindOne,
      planFindOne,
      managerUpdate,
      managerSave,
      transaction,
    ].forEach((m) => m.mockReset());

    isGymOwner.mockResolvedValue(true);
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'gym-1',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);
    planFindOne.mockResolvedValue({
      id: 'plan-1',
      gymId: 'gym-1',
      name: 'Unlimited',
      billingCycle: 'monthly',
      status: 'active',
    } as MembershipPlanEntity);
    managerSave.mockImplementation((_entity, row) => Promise.resolve(row));
    transaction.mockImplementation((work) =>
      work({ update: managerUpdate, save: managerSave }),
    );

    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AssignMembershipPlanHandler,
        { provide: GymStaffService, useValue: { isGymOwner } },
        { provide: DataSource, useValue: { transaction } },
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: { findOne: membershipFindOne },
        },
        {
          provide: getRepositoryToken(MembershipPlanEntity),
          useValue: { findOne: planFindOne },
        },
      ],
    }).compile();

    handler = moduleRef.get(AssignMembershipPlanHandler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const command = new AssignMembershipPlanCommand(
    'owner-1',
    'gym-1',
    'gm-1',
    'plan-1',
  );

  it('expires any existing active plan before creating the new one', async () => {
    await handler.execute(command);

    expect(managerUpdate).toHaveBeenCalledWith(
      AthleteMembershipPlanEntity,
      { gymMembershipId: 'gm-1', status: 'active' },
      { status: 'expired' },
    );
    expect(managerUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      managerSave.mock.invocationCallOrder[0],
    );
  });

  it('creates a monthly plan expiring one month out, auto-roll on', async () => {
    const result = await handler.execute(command);

    expect(result).toMatchObject({
      gymMembershipId: 'gm-1',
      membershipPlanId: 'plan-1',
      planName: 'Unlimited',
      status: 'active',
      startedAt: NOW,
      expiresAt: new Date('2026-09-11T10:00:00.000Z'),
      autoRoll: true,
      autoRollCount: 0,
    });
    expect(result.id).toEqual(expect.any(String));
  });

  it('creates an annual plan expiring one year out', async () => {
    planFindOne.mockResolvedValue({
      id: 'plan-1',
      gymId: 'gym-1',
      name: 'Annual',
      billingCycle: 'annual',
      status: 'active',
    } as MembershipPlanEntity);

    const result = await handler.execute(command);

    expect(result.expiresAt).toEqual(new Date('2027-08-11T10:00:00.000Z'));
  });

  it('403s when the caller is not an owner of the gym', async () => {
    isGymOwner.mockResolvedValue(false);

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('404s when the membership does not exist', async () => {
    membershipFindOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('403s when the membership belongs to another gym', async () => {
    membershipFindOne.mockResolvedValue({
      id: 'gm-1',
      gymId: 'other-gym',
      userId: 'user-1',
      status: 'active',
    } as GymMembershipEntity);

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
  });

  it('404s when the plan is missing, archived, or from another gym', async () => {
    planFindOne.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(planFindOne).toHaveBeenCalledWith({
      where: { id: 'plan-1', gymId: 'gym-1', status: 'active' },
    });
  });
});
