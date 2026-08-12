import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In } from 'typeorm';
import { MembershipPlansQueryService } from './membership-plans.service';
import { MembershipPlanEntity } from '../../domain/membership-plan/entities/membership-plan.entity';
import { AthleteMembershipPlanEntity } from '../../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

function buildPlan(overrides: Partial<MembershipPlanEntity> = {}) {
  const plan = new MembershipPlanEntity();
  plan.id = 'plan-1';
  plan.gymId = 'gym-1';
  plan.name = 'Unlimited';
  plan.pricing = 12000;
  plan.billingCycle = 'monthly';
  plan.classTypes = ['ct-1', 'ct-2'];
  plan.status = 'active';
  plan.createdAt = new Date('2026-01-01T00:00:00.000Z');
  return Object.assign(plan, overrides);
}

describe('MembershipPlansQueryService', () => {
  let service: MembershipPlansQueryService;
  const planFind = jest.fn();
  const athletePlanFind = jest.fn();

  beforeEach(async () => {
    planFind.mockReset();
    athletePlanFind.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        MembershipPlansQueryService,
        {
          provide: getRepositoryToken(MembershipPlanEntity),
          useValue: { find: planFind },
        },
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { find: athletePlanFind },
        },
      ],
    }).compile();

    service = moduleRef.get(MembershipPlansQueryService);
  });

  it('scopes the plan query to the gym and orders by creation date', async () => {
    planFind.mockResolvedValue([]);

    await service.getPlansByGym('gym-1');

    expect(planFind).toHaveBeenCalledWith({
      where: { gymId: 'gym-1' },
      order: { createdAt: 'DESC' },
    });
    expect(athletePlanFind).not.toHaveBeenCalled();
  });

  it('returns plans with their active subscriber counts', async () => {
    planFind.mockResolvedValue([
      buildPlan(),
      buildPlan({ id: 'plan-2', name: 'Basic', status: 'archived' }),
    ]);
    athletePlanFind.mockResolvedValue([
      { membershipPlanId: 'plan-1' },
      { membershipPlanId: 'plan-1' },
      { membershipPlanId: 'plan-2' },
    ]);

    const result = await service.getPlansByGym('gym-1');

    expect(athletePlanFind).toHaveBeenCalledWith({
      where: { status: 'active', membershipPlanId: In(['plan-1', 'plan-2']) },
      select: ['membershipPlanId'],
    });
    expect(result.plans).toEqual([
      {
        id: 'plan-1',
        name: 'Unlimited',
        pricing: 12000,
        billingCycle: 'monthly',
        classTypes: ['ct-1', 'ct-2'],
        status: 'active',
        subscriberCount: 2,
      },
      {
        id: 'plan-2',
        name: 'Basic',
        pricing: 12000,
        billingCycle: 'monthly',
        classTypes: ['ct-1', 'ct-2'],
        status: 'archived',
        subscriberCount: 1,
      },
    ]);
  });

  it('reports zero subscribers for a plan nobody is on', async () => {
    planFind.mockResolvedValue([buildPlan()]);
    athletePlanFind.mockResolvedValue([]);

    const result = await service.getPlansByGym('gym-1');

    expect(result.plans[0].subscriberCount).toBe(0);
  });

  it('returns an empty list for a gym with no plans', async () => {
    planFind.mockResolvedValue([]);

    const result = await service.getPlansByGym('gym-1');

    expect(result).toEqual({ plans: [] });
  });
});
