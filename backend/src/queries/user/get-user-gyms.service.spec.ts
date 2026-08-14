import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GetUserGymsService } from './get-user-gyms.service';
import { GymStaffEntity } from '../../domain/gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../../domain/gym-membership/entities/gym-membership.entity';
import { GymEntity } from '../../domain/gym/entities/gym.entity';

describe('GetUserGymsService', () => {
  let service: GetUserGymsService;
  let staffFind: jest.Mock;
  let membershipFind: jest.Mock;
  let gymFind: jest.Mock;

  const USER_ID = 'user-1';

  beforeEach(async () => {
    staffFind = jest.fn().mockResolvedValue([]);
    membershipFind = jest.fn().mockResolvedValue([]);
    gymFind = jest.fn().mockResolvedValue([
      { id: 'gym-a', name: 'Box A' },
      { id: 'gym-b', name: 'Box B' },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserGymsService,
        { provide: getRepositoryToken(GymStaffEntity), useValue: { find: staffFind } },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: { find: membershipFind } },
        { provide: getRepositoryToken(GymEntity), useValue: { find: gymFind } },
      ],
    }).compile();

    service = module.get(GetUserGymsService);
  });

  it('returns both staffed and member gyms', async () => {
    staffFind.mockResolvedValue([{ gymId: 'gym-a', role: 'coach', status: 'active' }]);
    membershipFind.mockResolvedValue([{ gymId: 'gym-b', status: 'active' }]);

    const result = await service.getGyms(USER_ID);

    expect(result.gyms).toEqual([
      { gymId: 'gym-a', gymName: 'Box A', role: 'coach' },
      { gymId: 'gym-b', gymName: 'Box B', role: 'athlete' },
    ]);
  });

  it('reports one entry per gym, staff winning over membership', async () => {
    staffFind.mockResolvedValue([{ gymId: 'gym-a', role: 'owner', status: 'active' }]);
    membershipFind.mockResolvedValue([{ gymId: 'gym-a', status: 'active' }]);

    const result = await service.getGyms(USER_ID);

    expect(result.gyms).toEqual([{ gymId: 'gym-a', gymName: 'Box A', role: 'owner' }]);
  });

  it('returns an empty list for a user with no gym', async () => {
    await expect(service.getGyms(USER_ID)).resolves.toEqual({ gyms: [] });
  });

  it('only counts active attachments', async () => {
    await service.getGyms(USER_ID);

    expect(staffFind).toHaveBeenCalledWith({ where: { userId: USER_ID, status: 'active' } });
    expect(membershipFind).toHaveBeenCalledWith({ where: { userId: USER_ID, status: 'active' } });
  });
});
