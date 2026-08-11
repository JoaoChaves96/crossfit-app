import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LessThanOrEqual } from 'typeorm';
import { AthleteMembershipPlanRepository } from './athlete-membership-plan.repository';
import { AthleteMembershipPlanEntity } from '../domain/athlete-membership-plan/entities/athlete-membership-plan.entity';

describe('AthleteMembershipPlanRepository', () => {
  let repository: AthleteMembershipPlanRepository;
  const find = jest.fn();

  beforeEach(async () => {
    find.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AthleteMembershipPlanRepository,
        {
          provide: getRepositoryToken(AthleteMembershipPlanEntity),
          useValue: { find, save: jest.fn(), findOne: jest.fn() },
        },
      ],
    }).compile();

    repository = moduleRef.get(AthleteMembershipPlanRepository);
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
