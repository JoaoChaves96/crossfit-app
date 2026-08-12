import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThanOrEqual } from 'typeorm';
import { AthleteMembershipPlanRepository } from './athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from '../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

function buildPlan(
  overrides: Partial<AthleteMembershipPlanEntity>,
): AthleteMembershipPlanEntity {
  return Object.assign(new AthleteMembershipPlanEntity(), {
    gymMembershipId: 'gm-1',
    membershipPlanId: 'plan-1',
    status: 'active',
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: null,
    autoRoll: true,
    autoRollCount: 0,
    ...overrides,
  });
}

describe('AthleteMembershipPlanRepository', () => {
  let repository: AthleteMembershipPlanRepository;
  const find = jest.fn();
  const findOne = jest.fn();

  beforeEach(async () => {
    find.mockReset();
    findOne.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AthleteMembershipPlanRepository,
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { find, save: jest.fn(), findOne },
        },
      ],
    }).compile();

    repository = moduleRef.get(AthleteMembershipPlanRepository);
  });

  describe('getActivePlanByGymMembership', () => {
    // The relation is ManyToOne, so a membership legitimately holds many plan
    // rows. The current-plan read must pick the active one out of that history
    // and must never surface an expired row.
    it('returns the active row when the membership also holds an expired one', async () => {
      const rows = [
        buildPlan({ id: 'amp-old', status: 'expired' }),
        buildPlan({ id: 'amp-new', status: 'active' }),
      ];
      findOne.mockImplementation(
        ({ where }: { where: Partial<AthleteMembershipPlanEntity> }) =>
          Promise.resolve(
            rows.find(
              (row) =>
                row.gymMembershipId === where.gymMembershipId &&
                row.status === where.status,
            ) ?? null,
          ),
      );

      const result = await repository.getActivePlanByGymMembership('gm-1');

      expect(result?.id).toBe('amp-new');
      expect(result?.status).toBe('active');
    });

    it('returns null when every row in the history is expired', async () => {
      const rows = [
        buildPlan({ id: 'amp-old', status: 'expired' }),
        buildPlan({ id: 'amp-older', status: 'expired' }),
      ];
      findOne.mockImplementation(
        ({ where }: { where: Partial<AthleteMembershipPlanEntity> }) =>
          Promise.resolve(
            rows.find(
              (row) =>
                row.gymMembershipId === where.gymMembershipId &&
                row.status === where.status,
            ) ?? null,
          ),
      );

      await expect(
        repository.getActivePlanByGymMembership('gm-1'),
      ).resolves.toBeNull();
    });

    it('filters on status so the query can never match an expired row', async () => {
      findOne.mockResolvedValue(null);

      await repository.getActivePlanByGymMembership('gm-1');

      expect(findOne).toHaveBeenCalledWith({
        where: { gymMembershipId: 'gm-1', status: 'active' },
        relations: ['membershipPlan'],
      });
    });
  });

  describe('getAllPlansByGymMembership', () => {
    it('returns the whole history, expired rows included', async () => {
      const rows = [
        buildPlan({ id: 'amp-old', status: 'expired' }),
        buildPlan({ id: 'amp-new', status: 'active' }),
      ];
      find.mockResolvedValue(rows);

      const result = await repository.getAllPlansByGymMembership('gm-1');

      expect(result.map((row) => row.id)).toEqual(['amp-old', 'amp-new']);
      expect(find).toHaveBeenCalledWith({
        where: { gymMembershipId: 'gm-1' },
        relations: ['membershipPlan'],
      });
    });
  });

  describe('findDueForRenewal', () => {
    it('queries active rows with a non-null expiry at or before now', async () => {
      const now = new Date('2026-08-11T10:00:00.000Z');
      find.mockResolvedValue([]);

      await repository.findDueForRenewal(now);

      expect(find).toHaveBeenCalledWith({
        where: {
          status: 'active',
          expiresAt: LessThanOrEqual(now),
        },
        relations: ['membershipPlan'],
      });
    });

    it('returns the rows the underlying repository yields', async () => {
      const row = new AthleteMembershipPlanEntity();
      row.id = 'amp-1';
      find.mockResolvedValue([row]);

      const result = await repository.findDueForRenewal(
        new Date('2026-08-11T10:00:00.000Z'),
      );

      expect(result).toEqual([row]);
    });
  });
});
