import { UnauthorizedException } from '@nestjs/common';
import { GymOwnershipGuard } from './gym-ownership.guard';
import { ExecutionContext } from '@nestjs/common';

function buildContext(params: Record<string, string>, user?: { gymId?: string }): ExecutionContext {
  const request = { params, user };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('GymOwnershipGuard', () => {
  let guard: GymOwnershipGuard;

  beforeEach(() => {
    guard = new GymOwnershipGuard();
  });

  describe('when route has no gymId param', () => {
    it('returns true without checking user JWT claim', () => {
      const context = buildContext({}, undefined);
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('when route gymId matches JWT gymId claim', () => {
    it('returns true', () => {
      const context = buildContext({ gymId: 'gym-abc' }, { gymId: 'gym-abc' });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('when route gymId does NOT match JWT gymId claim', () => {
    it('throws UnauthorizedException', () => {
      const context = buildContext({ gymId: 'gym-abc' }, { gymId: 'gym-xyz' });
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('when route has gymId but user has no gymId claim', () => {
    it('throws UnauthorizedException', () => {
      const context = buildContext({ gymId: 'gym-abc' }, {});
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('when route has gymId but request has no user object', () => {
    it('throws UnauthorizedException', () => {
      const context = buildContext({ gymId: 'gym-abc' }, undefined);
      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
