import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UserEntity } from '../user/entities/user.entity';
import { GymStaffEntity } from '../gym-staff/entities/gym-staff.entity';
import { GymMembershipEntity } from '../gym-membership/entities/gym-membership.entity';

describe('AuthService.resolveGymContextFor', () => {
  let service: AuthService;
  let staffFindOne: jest.Mock;
  let membershipFindOne: jest.Mock;
  let sign: jest.Mock;

  const USER_ID = 'user-1';
  const GYM_ID = 'gym-b';

  beforeEach(async () => {
    staffFindOne = jest.fn().mockResolvedValue(null);
    membershipFindOne = jest.fn().mockResolvedValue(null);
    sign = jest.fn().mockReturnValue('signed.jwt');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: { findOne: jest.fn().mockResolvedValue({ id: USER_ID, email: 'u@example.com' }) } },
        { provide: getRepositoryToken(GymStaffEntity), useValue: { findOne: staffFindOne } },
        { provide: getRepositoryToken(GymMembershipEntity), useValue: { findOne: membershipFindOne } },
        { provide: JwtService, useValue: { sign } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('resolves the named gym from an active staff row', async () => {
    staffFindOne.mockResolvedValue({ gymId: GYM_ID, role: 'coach', status: 'active' });

    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).resolves.toEqual({
      gymId: GYM_ID,
      role: 'coach',
    });
  });

  it('falls back to an active membership as athlete', async () => {
    membershipFindOne.mockResolvedValue({ gymId: GYM_ID, status: 'active' });

    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).resolves.toEqual({
      gymId: GYM_ID,
      role: 'athlete',
    });
  });

  it('prefers staff over membership at the same gym', async () => {
    staffFindOne.mockResolvedValue({ gymId: GYM_ID, role: 'owner', status: 'active' });
    membershipFindOne.mockResolvedValue({ gymId: GYM_ID, status: 'active' });

    const result = await service.resolveGymContextFor(USER_ID, GYM_ID);

    expect(result.role).toBe('owner');
    expect(membershipFindOne).not.toHaveBeenCalled();
  });

  it('refuses a gym the user is not attached to', async () => {
    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).rejects.toThrow(ForbiddenException);
  });

  it('refuses when the only staff row is inactive', async () => {
    // The active filter lives in the query, so assert the query asked for it.
    await expect(service.resolveGymContextFor(USER_ID, GYM_ID)).rejects.toThrow(ForbiddenException);
    expect(staffFindOne).toHaveBeenCalledWith({
      where: { userId: USER_ID, gymId: GYM_ID, status: 'active' },
    });
  });

  it('issueTokenForGym signs the named gym context', async () => {
    staffFindOne.mockResolvedValue({ gymId: GYM_ID, role: 'coach', status: 'active' });

    const token = await service.issueTokenForGym(USER_ID, GYM_ID);

    expect(token).toBe('signed.jwt');
    expect(sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: USER_ID, gymId: GYM_ID, role: 'coach' }),
    );
  });
});
