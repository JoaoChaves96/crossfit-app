import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { GymStaffService } from '../../domain/gym-staff/gym-staff.service';
import { GymMembershipRepository } from '../../repositories/gym-membership.repository';
import { ROLE_KEY } from '../decorators/role.decorator';
import { USER_SCOPED_KEY } from '../decorators/user-scoped.decorator';

function buildContext(options: {
  userId?: string;
  params?: Record<string, string>;
}): ExecutionContext {
  const request = {
    user: options.userId ? { id: options.userId } : undefined,
    params: options.params ?? {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let gymStaffService: jest.Mocked<GymStaffService>;
  let gymMembershipRepository: jest.Mocked<GymMembershipRepository>;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    gymStaffService = {
      isGymOwner: jest.fn(),
      isCoach: jest.fn(),
      isCoachAssignedToClass: jest.fn(),
    } as unknown as jest.Mocked<GymStaffService>;

    gymMembershipRepository = {
      hasActiveMembershipInGym: jest.fn(),
    } as unknown as jest.Mocked<GymMembershipRepository>;

    guard = new RolesGuard(reflector, gymStaffService, gymMembershipRepository);
  });

  describe('when no role metadata is set on handler', () => {
    it('returns true (public route)', async () => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return undefined;
        return undefined;
      });

      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });
  });

  describe('when required role is owner', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['owner'];
        if (key === USER_SCOPED_KEY) return undefined;
        return undefined;
      });
    });

    it('returns true when user is gym owner', async () => {
      gymStaffService.isGymOwner.mockResolvedValue(true);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when user is not gym owner', async () => {
      gymStaffService.isGymOwner.mockResolvedValue(false);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when required role is coach (gym-scoped, no classId)', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['coach'];
        if (key === USER_SCOPED_KEY) return undefined;
        return undefined;
      });
    });

    it('returns true when user is a coach in the gym', async () => {
      gymStaffService.isCoach.mockResolvedValue(true);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when user is not a coach in the gym', async () => {
      gymStaffService.isCoach.mockResolvedValue(false);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when required role is coach and classId is present', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['coach'];
        if (key === USER_SCOPED_KEY) return undefined;
        return undefined;
      });
    });

    it('returns true when user is assigned to the class', async () => {
      gymStaffService.isCoachAssignedToClass.mockResolvedValue(true);
      const context = buildContext({
        userId: 'user-1',
        params: { gymId: 'gym-1', classId: 'class-1' },
      });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when user is not assigned to the class', async () => {
      gymStaffService.isCoachAssignedToClass.mockResolvedValue(false);
      const context = buildContext({
        userId: 'user-1',
        params: { gymId: 'gym-1', classId: 'class-1' },
      });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when required role is athlete (gym-scoped)', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['athlete'];
        if (key === USER_SCOPED_KEY) return undefined;
        return undefined;
      });
    });

    it('returns true when user has active membership in the gym', async () => {
      gymMembershipRepository.hasActiveMembershipInGym.mockResolvedValue(true);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when user has no active membership', async () => {
      gymMembershipRepository.hasActiveMembershipInGym.mockResolvedValue(false);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when required role is athlete (user-scoped)', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['athlete'];
        if (key === USER_SCOPED_KEY) return true;
        return undefined;
      });
    });

    it('returns true when user is authenticated, regardless of gym membership', async () => {
      const context = buildContext({ userId: 'user-1', params: {} });
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(gymMembershipRepository.hasActiveMembershipInGym).not.toHaveBeenCalled();
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['owner'];
        if (key === USER_SCOPED_KEY) return undefined;
        return undefined;
      });
    });

    it('throws ForbiddenException when request has no user', async () => {
      const context = buildContext({ params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when gymId is missing from route for a gym-scoped role', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['owner'];
        if (key === USER_SCOPED_KEY) return undefined;
        return undefined;
      });
    });

    it('throws ForbiddenException when gymId is absent from params', async () => {
      const context = buildContext({ userId: 'user-1', params: {} });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when multiple roles are allowed (OR semantics)', () => {
    beforeEach(() => {
      reflector.get.mockImplementation((key: string) => {
        if (key === ROLE_KEY) return ['owner', 'coach'];
        if (key === USER_SCOPED_KEY) return undefined;
        return undefined;
      });
    });

    it('returns true when user satisfies the second role but not the first', async () => {
      gymStaffService.isGymOwner.mockResolvedValue(false);
      gymStaffService.isCoach.mockResolvedValue(true);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('throws ForbiddenException when user satisfies neither role', async () => {
      gymStaffService.isGymOwner.mockResolvedValue(false);
      gymStaffService.isCoach.mockResolvedValue(false);
      const context = buildContext({ userId: 'user-1', params: { gymId: 'gym-1' } });
      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});
