import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GymMembershipRepository } from './gym-membership.repository';
import { GymMembershipEntity } from '../domain/gym-membership/entities/gym-membership.entity';

describe('GymMembershipRepository', () => {
  let repository: GymMembershipRepository;
  const findOne = jest.fn();

  beforeEach(async () => {
    findOne.mockReset();
    findOne.mockResolvedValue(null);

    const moduleRef = await Test.createTestingModule({
      providers: [
        GymMembershipRepository,
        {
          provide: getRepositoryToken(GymMembershipEntity),
          useValue: {
            findOne,
            find: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = moduleRef.get(GymMembershipRepository);
  });

  // A membership holds a history of plan rows and none of them is
  // authoritatively "the current plan", so these reads must not eager-load
  // them — that is exactly how an expired row used to leak into callers.
  describe('getGymMembershipById', () => {
    it('loads the membership without any plan relation', async () => {
      await repository.getGymMembershipById('gm-1');

      expect(findOne).toHaveBeenCalledWith({ where: { id: 'gm-1' } });
    });
  });

  describe('getActiveGymMembershipByUserAndGym', () => {
    it('loads the active membership without any plan relation', async () => {
      await repository.getActiveGymMembershipByUserAndGym('user-1', 'gym-1');

      expect(findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', gymId: 'gym-1', status: 'active' },
      });
    });

    it('returns null when the user has no active membership in the gym', async () => {
      await expect(
        repository.getActiveGymMembershipByUserAndGym('user-1', 'gym-1'),
      ).resolves.toBeNull();
    });
  });
});
