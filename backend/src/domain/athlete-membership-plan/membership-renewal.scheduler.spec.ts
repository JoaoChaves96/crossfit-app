import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
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

/**
 * New coverage added in the fix round after code review (Ruling A: the
 * catch-up cap expires rather than rolls; Ruling B: month-end clamping;
 * plus a per-row save failure must not abort the rest of the sweep). The
 * describe block above is the brief's verbatim suite and is left untouched.
 */
describe('MembershipRenewalScheduler — month-end clamping, catch-up cap, and save failures', () => {
  let scheduler: MembershipRenewalScheduler;
  const findDueForRenewal = jest.fn();
  const save = jest.fn();

  beforeEach(async () => {
    findDueForRenewal.mockReset();
    save.mockReset();
    save.mockImplementation((entity) => Promise.resolve(entity));
    jest.useFakeTimers();

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
    jest.restoreAllMocks();
  });

  it('clamps a monthly roll to the last valid day of a short target month (Jan 31 -> Feb 28)', async () => {
    jest.setSystemTime(new Date('2025-02-15T00:00:00.000Z'));
    const row = buildDuePlan({ expiresAt: new Date('2025-01-31T00:00:00.000Z') });
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.status).toBe('active');
    expect(row.expiresAt).toEqual(new Date('2025-02-28T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(1);
  });

  it('clamps a monthly roll to Feb 29 in a leap year (Jan 31 -> Feb 29)', async () => {
    jest.setSystemTime(new Date('2024-02-15T00:00:00.000Z'));
    const row = buildDuePlan({ expiresAt: new Date('2024-01-31T00:00:00.000Z') });
    findDueForRenewal.mockResolvedValue([row]);

    await scheduler.rollOrExpireMemberships();

    expect(row.status).toBe('active');
    expect(row.expiresAt).toEqual(new Date('2024-02-29T00:00:00.000Z'));
    expect(row.autoRollCount).toBe(1);
  });

  it('expires, without rolling, a plan still overdue after the catch-up cap', async () => {
    jest.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));
    const originalExpiry = new Date('1990-01-01T00:00:00.000Z');
    const row = buildDuePlan({ expiresAt: originalExpiry, autoRollCount: 0 });
    findDueForRenewal.mockResolvedValue([row]);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await scheduler.rollOrExpireMemberships();

    // 240 monthly cycles is 20 years; starting in 1990 does not reach 2026.
    expect(row.status).toBe('expired');
    expect(row.expiresAt).toEqual(originalExpiry);
    expect(row.autoRollCount).toBe(0);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(row);
  });

  it('continues sweeping remaining rows when one row fails to save', async () => {
    jest.setSystemTime(new Date('2026-08-11T10:00:00.000Z'));
    const failingRow = buildDuePlan({ id: 'amp-bad', autoRoll: false });
    const healthyRow = buildDuePlan({ id: 'amp-good' });
    findDueForRenewal.mockResolvedValue([failingRow, healthyRow]);
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    save.mockImplementation((entity: AthleteMembershipPlanEntity) => {
      if (entity.id === 'amp-bad') {
        return Promise.reject(new Error('constraint violation'));
      }
      return Promise.resolve(entity);
    });

    await expect(scheduler.rollOrExpireMemberships()).resolves.toBeUndefined();

    expect(healthyRow.status).toBe('active');
    expect(healthyRow.expiresAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
    expect(healthyRow.autoRollCount).toBe(1);
    expect(save).toHaveBeenCalledWith(healthyRow);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
