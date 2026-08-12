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
 * Plan coverage is compared on the SERVER-LOCAL calendar, matching both
 * ClassScheduleService.formatDate and the expiresAt-vs-now comparison in
 * MembershipRenewalScheduler. Dates here are therefore built from local
 * components (not `...Z` literals) so the suite asserts the same calendar the
 * production code uses, on any host timezone.
 */
const NOW = new Date(2026, 7, 11, 10, 0, 0); // 2026-08-11 10:00 local
const localDate = (year: number, month: number, day: number) =>
  new Date(year, month - 1, day, 9, 0, 0);

function buildClass(overrides: Record<string, unknown> = {}) {
  return {
    id: 'class-1',
    gymId: 'gym-1',
    classTypeId: 'ct-1',
    classType: { name: 'WOD' },
    scheduledDate: localDate(2026, 8, 12),
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
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: null,
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
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

  it('reports planExpiresAt as null for an unlimited plan and hides nothing', async () => {
    getClassesByGym.mockResolvedValue([
      buildClass(),
      buildClass({ id: 'class-2', scheduledDate: localDate(2027, 1, 1) }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.planExpiresAt).toBeNull();
    expect(result.classes).toHaveLength(2);
  });

  it('reports planExpiresAt and hides classes scheduled after the cutoff', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: localDate(2026, 8, 20),
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([
      buildClass({ id: 'inside', scheduledDate: localDate(2026, 8, 19) }),
      // Later in the day than the expiry instant, but on the expiry DATE:
      // the member keeps their whole final calendar day.
      buildClass({
        id: 'on-cutoff',
        scheduledDate: new Date(2026, 7, 20, 19, 0, 0),
      }),
      buildClass({ id: 'past-cutoff', scheduledDate: localDate(2026, 8, 21) }),
    ]);

    const result = await service.getClassScheduleForAthlete('gym-1', 'user-1');

    expect(result.planExpiresAt).toBe('2026-08-20');
    expect(result.classes.map((cls) => cls.id)).toEqual([
      'inside',
      'on-cutoff',
    ]);
  });

  it('refuses the whole schedule when the plan has already lapsed', async () => {
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: localDate(2026, 8, 1),
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([buildClass()]);

    await expect(
      service.getClassScheduleForAthlete('gym-1', 'user-1'),
    ).rejects.toThrow('Athlete membership plan has expired');
  });

  it('refuses the schedule for a lapsed plan whose row still reads active', async () => {
    // The hourly scheduler has not ticked yet: status is stale, expiresAt is not.
    getActivePlanByGymMembership.mockResolvedValue({
      id: 'amp-1',
      status: 'active',
      expiresAt: new Date(NOW.getTime() - 60 * 1000),
      membershipPlan: { id: 'plan-1', name: 'Unlimited', classTypes: ['ct-1'] },
    });
    getClassesByGym.mockResolvedValue([buildClass()]);

    await expect(
      service.getClassScheduleForAthlete('gym-1', 'user-1'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('leaves the owner schedule free of plan fields', async () => {
    getClassesByGym.mockResolvedValue([buildClass()]);

    const result = await service.getClassScheduleForOwner('gym-1');

    expect(result.planExpiresAt).toBeNull();
    expect(result.classes).toHaveLength(1);
  });
});
