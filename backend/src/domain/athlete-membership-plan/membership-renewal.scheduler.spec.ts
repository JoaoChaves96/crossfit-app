import { Test } from '@nestjs/testing';
import { MembershipRenewalScheduler } from './membership-renewal.scheduler';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from './entities/athlete-membership-plan.entity';
import { MembershipPlanEntity } from '../membership-plan/entities/membership-plan.entity';

function buildDuePlan(overrides: Partial<AthleteMembershipPlanEntity> = {}) {
  const plan = new MembershipPlanEntity();
  plan.id = 'plan-1';
  plan.billingCycle = 'monthly';

  const row = new AthleteMembershipPlanEntity();
  row.id = 'amp-1';
  row.gymMembershipId = 'gm-1';
  row.membershipPlanId = plan.id;
  row.membershipPlan = plan;
  row.status = 'active';
  row.expiresAt = new Date('2026-08-01T00:00:00.000Z');
  row.autoRoll = true;
  row.autoRollCount = 0;

  return Object.assign(row, overrides);
}

describe('MembershipRenewalScheduler', () => {
  let scheduler: MembershipRenewalScheduler;
  const findDueForRenewal = jest.fn();
  const save = jest.fn();

  beforeEach(async () => {
    findDueForRenewal.mockReset();
    save.mockReset();
    save.mockImplementation((entity) => Promise.resolve(entity));
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      providers: [
        MembershipRenewalScheduler,
        {
          provide: AthleteMembershipPlanRepository,
          useValue: { findDueForRenewal, save },
        },
      ],
    }).compile();

    scheduler = moduleRef.get(MembershipRenewalScheduler);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('rolls a monthly auto-roll plan forward from its old expiry, not from now', async () => {
    const row = buildDuePlan();
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.status).toBe('active');
    expect(row.expiresAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(1);
    expect(save).toHaveBeenCalledWith(row);
  });

  it('rolls an annual auto-roll plan forward by a year', async () => {
    const row = buildDuePlan();
    row.membershipPlan.billingCycle = 'annual';
    row.expiresAt = new Date('2026-08-01T00:00:00.000Z');
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.expiresAt).toEqual(new Date('2027-08-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(1);
  });

  it('catches a many-cycles-overdue plan up to a future date in one pass', async () => {
    const row = buildDuePlan({ expiresAt: new Date('2026-02-01T00:00:00.000Z') });
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.expiresAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(7);
    expect(row.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('expires a due plan whose auto-roll is off', async () => {
    const row = buildDuePlan({ autoRoll: false });
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.status).toBe('expired');
    expect(row.expiresAt).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(0);
    expect(save).toHaveBeenCalledWith(row);
  });

  it('saves nothing when no plans are due', async () => {
    findDueForRenewal.mockResolvedValue([]);

    await scheduler.rollOrExpireMemberships();

    expect(save).not.toHaveBeenCalled();
  });
});
