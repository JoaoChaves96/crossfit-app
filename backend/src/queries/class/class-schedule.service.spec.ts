import { Test } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ClassScheduleService } from './class-schedule.service';
import { ClassRepository } from '../../repositories/class.repository';
import { BookingRepository } from '../../repositories/booking.repository';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';
import { AthleteMembershipPlanRepository } from '../../repositories/athlete-membership-plan.repository';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { GymService } from '../../domain/gym/gym.service';

/**
 * Plan coverage is truncated on the SERVER-LOCAL calendar, so these assertions
 * are only meaningful under a known, non-UTC offset. The zone is pinned to
 * America/New_York (UTC-4 in August) by jest `globalSetup` — see
 * `test/jest-tz.setup.ts` for why it cannot be pinned from inside this file.
 */
const NOW = new Date('2026-08-11T14:00:00.000Z'); // 2026-08-11 10:00 EDT

/** A wall-clock instant in the pinned zone. */
const nyDate = (
  year: number,
  month: number,
  day: number,
  hour = 9,
  minute = 0,
) => new Date(year, month - 1, day, hour, minute, 0);

function buildClass(overrides: Record<string, unknown> = {}) {
  return {
    id: 'class-1',
    gymId: 'gym-1',
    classTypeId: 'ct-1',
    classType: { name: 'WOD' },
    scheduledDate: nyDate(2026, 8, 12),
    scheduledTime: '09:00',
    coachUserId: 'coach-1',
    coach: { name: 'Coach Ann' },
    spaceId: 'space-1',
    space: { name: 'Main Floor' },
    capacity: 20,
    duration: 60,
    state: 'published',
    ...overrides,
  };
}

describe('ClassScheduleService — plan expiry', () => {
  let service: ClassScheduleService;
  const getClassesByGym = jest.fn();
  const countBookedBookings = jest.fn();
  const getActiveGymMembershipByUserAndGym = jest.fn();
  const getActivePlanByGymMembership = jest.fn();
  const getGymById = jest.fn();

  beforeEach(async () => {
    [
      getClassesByGym,
      countBookedBookings,
      getActiveGymMembershipByUserAndGym,
      getActivePlanByGymMembership,
      getGymById,
    ].forEach((m) => m.mockReset());

    countBookedBookings.mockResolvedValue(0);
    getGymById.mockResolvedValue({ id: 'gym-1', name: 'CrossFit Downtown' });
    getActiveGymMembershipByUserAndGym.mockResolvedValue({ id: 'gm-1' });
    // autoRoll true is the production default, so the unlimited baseline uses it:
    // an unlimited plan must be unaffected by the auto-roll derivation.
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: null,
      autoRoll: true,
      membershipPlan: {
        id: 'plan-1',
        name: 'Unlimited',
        classTypes: ['ct-1'],
        billingCycle: 'monthly',
      },
    });

    jest.useFakeTimers();
    jest.setSystemTime(NOW);

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClassScheduleService,
        { provide: ClassRepository, useValue: { getClassesByGym } },
        { provide: BookingRepository, useValue: { countBookedBookings } },
        {
          provide: GymMembershipRepository,
          useValue: { getActiveGymMembershipByUserAndGym },
        },
        {
          provide: AthleteMembershipPlanRepository,
          useValue: { getActivePlanByGymMembership },
        },
        { provide: GymStaffService, useValue: { isCoach: jest.fn() } },
        { provide: GymService, useValue: { getGymById } },
      ],
    }).compile();

    service = moduleRef.get(ClassScheduleService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('runs under the pinned timezone the coverage assertions depend on', () => {
    // Guards the assertions below: if this offset ever reads 0, local and UTC
    // truncation coincide and the boundary cases stop discriminating.
    expect(NOW.getTimezoneOffset()).toBe(240);
  });

  it('reports planExpiresAt as null for an unlimited plan and hides nothing', async () => {
    getClassesByGym.mockResolvedValue([
      buildClass(),
      buildClass({ id: 'class-2', scheduledDate: nyDate(2027, 1, 1) }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.planExpiresAt).toBeNull();
    expect(result.classes).toHaveLength(2);
  });

  it('reports planExpiresAt and hides classes scheduled after the cutoff', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: nyDate(2026, 8, 20, 9),
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([
      buildClass({ id: 'inside', scheduledDate: nyDate(2026, 8, 19) }),
      // Later in the day than the expiry instant, but on the expiry DATE:
      // coverage is day-granular, so this one is still shown.
      buildClass({ id: 'on-cutoff', scheduledDate: nyDate(2026, 8, 20, 19) }),
      buildClass({ id: 'past-cutoff', scheduledDate: nyDate(2026, 8, 21) }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.planExpiresAt).toBe('2026-08-20');
    expect(result.classes.map((cls) => cls.id)).toEqual([
      'inside',
      'on-cutoff',
    ]);
  });

  /**
   * The discriminating case. 2026-08-20 20:30 EDT is 2026-08-21T00:30Z, so
   * local and UTC truncation disagree: local says the plan covers through
   * 08-20, UTC says 08-21. Under UTC truncation this test fails twice over —
   * planExpiresAt would read '2026-08-21' and the 08-21 class would be shown,
   * granting a day of access the plan never paid for.
   */
  it('truncates the cutoff on the local calendar, not the UTC one', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: nyDate(2026, 8, 20, 20, 30),
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([
      buildClass({ id: 'inside', scheduledDate: nyDate(2026, 8, 20, 12) }),
      buildClass({ id: 'past-cutoff', scheduledDate: nyDate(2026, 8, 21, 12) }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.planExpiresAt).toBe('2026-08-20');
    expect(result.classes.map((cls) => cls.id)).toEqual(['inside']);
  });

  it('refuses the whole schedule when the plan has already lapsed', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: nyDate(2026, 8, 1),
      autoRoll: false,
      membershipPlan: {
        id: 'plan-1',
        name: 'Unlimited',
        classTypes: ['ct-1'],
        billingCycle: 'monthly',
      },
    });
    getClassesByGym.mockResolvedValue([buildClass()]);

    await expect(
      service.getClassScheduleForAthlete('gym-1', 'user-1'),
    ).rejects.toThrow('Athlete membership plan has expired');
  });

  it('refuses the schedule for a lapsed plan whose row still reads active', async () => {
    // The hourly scheduler has not ticked yet: status is stale, expiresAt is not.
    // autoRoll is off, so there is nothing to derive — expired is expired.
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: new Date(NOW.getTime() - 60 * 1000),
      autoRoll: false,
      membershipPlan: {
        id: 'plan-1',
        name: 'Unlimited',
        classTypes: ['ct-1'],
        billingCycle: 'monthly',
      },
    });
    getClassesByGym.mockResolvedValue([buildClass()]);

    await expect(
      service.getClassScheduleForAthlete('gym-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  /**
   * The between-ticks hole. MembershipRenewalScheduler only rolls hourly, so an
   * auto-roll member sits on a stale past expiresAt for up to an hour once per
   * billing cycle. Judging the request against the stored value 403s a
   * fully-paid, auto-renewing member off the ENTIRE schedule for that window —
   * and the athlete app renders any non-2xx as an error screen, not as the
   * graceful cutoff note. The expiry is derived here instead.
   */
  describe('auto-roll plan the hourly scheduler has not reached yet', () => {
    const lapsedAutoRollPlan = (expiresAt: Date) => ({
      id: 'amp-1',
      status: 'active',
      expiresAt,
      autoRoll: true,
      membershipPlan: {
        id: 'plan-1',
        name: 'Unlimited',
        classTypes: ['ct-1'],
        billingCycle: 'monthly',
      },
    });

    it('serves the schedule and reports the ROLLED cutoff, not the stale one', async () => {
      getActivePlanByGymMembership.mockResolvedValue(
        // 2026-08-11 09:59 EDT — one minute ago.
        lapsedAutoRollPlan(new Date(NOW.getTime() - 60 * 1000)),
      );
      getClassesByGym.mockResolvedValue([
        buildClass({ id: 'inside-next-cycle', scheduledDate: nyDate(2026, 8, 12) }),
        buildClass({ id: 'past-next-cycle', scheduledDate: nyDate(2026, 9, 20) }),
      ]);

      const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

      expect(result.planExpiresAt).toBe('2026-09-11');
      expect(result.classes.map((cls) => cls.id)).toEqual(['inside-next-cycle']);
    });

    it('derives the first FUTURE cycle for a plan overdue by several cycles', async () => {
      getActivePlanByGymMembership.mockResolvedValue(
        // Three cycles stale: 2026-05-11 09:59 EDT.
        lapsedAutoRollPlan(
          new Date(NOW.getTime() - 60 * 1000 - 92 * 24 * 60 * 60 * 1000),
        ),
      );
      getClassesByGym.mockResolvedValue([buildClass()]);

      const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

      // 2026-06-11 would be one cycle past the stale date and still in the past.
      expect(result.planExpiresAt).toBe('2026-09-11');
    });

    it('still refuses a plan too far overdue to catch up', async () => {
      getActivePlanByGymMembership.mockResolvedValue(
        lapsedAutoRollPlan(new Date('2000-01-01T00:00:00.000Z')),
      );
      getClassesByGym.mockResolvedValue([buildClass()]);

      await expect(
        service.getClassScheduleForAthlete('gym-1', 'user-1'),
      ).rejects.toThrow('Athlete membership plan has expired');
    });
  });

  it('still hides a disallowed class type that falls inside coverage', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: nyDate(2026, 8, 20, 9),
      membershipPlan: { id: 'plan-1', name: 'WOD only', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([
      buildClass({ id: 'allowed', scheduledDate: nyDate(2026, 8, 19) }),
      buildClass({
        id: 'other-type',
        classTypeId: 'ct-2',
        scheduledDate: nyDate(2026, 8, 19),
      }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.classes.map((cls) => cls.id)).toEqual(['allowed']);
  });

  describe('when the driver returns scheduledDate as a string', () => {
    // ClassEntity.scheduledDate is @Column('date'), which some drivers hand
    // back as 'YYYY-MM-DD'. These cases pin what that path actually does today.
    it('covers a string-dated class comfortably inside the cutoff', async () => {
      getActivePlanByGymMembership.mockResolvedValue({
        id: 'amp-1',
        status: 'active',
        expiresAt: nyDate(2026, 8, 25, 9),
        membershipPlan: {
          id: 'plan-1',
          name: 'Unlimited',
          classTypes: ['ct-1'],
        },
      });
      getClassesByGym.mockResolvedValue([
        buildClass({ id: 'string-inside', scheduledDate: '2026-08-21' }),
        buildClass({ id: 'string-outside', scheduledDate: '2026-08-30' }),
      ]);

      const result = await service.getClassScheduleForAthlete(
        'gym-1',
        'user-1',
      );

      expect(result.classes.map((cls) => cls.id)).toEqual(['string-inside']);
    });

    /**
     * KNOWN SEAM, not desired behaviour. formatDate parses a bare 'YYYY-MM-DD'
     * as UTC midnight and then reads local getters, so west of UTC every
     * string-dated class reads one day EARLY: the class below is on 08-21 but
     * compares as 08-20, and a plan expiring 08-20 therefore over-grants it.
     * The direction is safe (a paying member is never cut short, and the
     * instant-granular lapse check still bounds access), and the formatDate
     * seam predates this task — this test exists so the over-grant is visible
     * rather than silent. Fixing formatDate would flip this expectation.
     */
    it('over-grants a string-dated class one day west of UTC', async () => {
      getActivePlanByGymMembership.mockResolvedValue({
        id: 'amp-1',
        status: 'active',
        expiresAt: nyDate(2026, 8, 20, 12),
        membershipPlan: {
          id: 'plan-1',
          name: 'Unlimited',
          classTypes: ['ct-1'],
        },
      });
      getClassesByGym.mockResolvedValue([
        buildClass({ id: 'string-day-after', scheduledDate: '2026-08-21' }),
      ]);

      const result = await service.getClassScheduleForAthlete(
        'gym-1',
        'user-1',
      );

      expect(result.planExpiresAt).toBe('2026-08-20');
      expect(result.classes.map((cls) => cls.id)).toEqual(['string-day-after']);
      expect(result.classes[0].scheduledDate).toBe('2026-08-20');
    });
  });

  it('leaves the owner schedule free of plan fields', async () => {
    getClassesByGym.mockResolvedValue([buildClass()]);

    const result = await service.getClassScheduleForOwner('gym-1');

    expect(result.planExpiresAt).toBeNull();
    expect(result.classes).toHaveLength(1);
  });
});
