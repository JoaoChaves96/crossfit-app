import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { GymStatusGuard } from './gym-status.guard';
import { GymEntity } from '../../domain/gym/entities/gym.entity';

type GymStatus = GymEntity['status'];

function buildContext(
  method: string,
  params: Record<string, string>,
): ExecutionContext {
  const request = { method, params };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('GymStatusGuard', () => {
  const GYM_ID = 'gym-1';
  let guard: GymStatusGuard;
  let found: { status: GymStatus } | null;
  let findOne: jest.Mock;

  beforeEach(() => {
    found = { status: 'active' };
    findOne = jest.fn().mockImplementation(() => Promise.resolve(found));
    guard = new GymStatusGuard({ findOne } as never);
  });

  describe('on a gym that is active', () => {
    it('allows a mutation', async () => {
      await expect(
        guard.canActivate(buildContext('POST', { gymId: GYM_ID })),
      ).resolves.toBe(true);
    });
  });

  // Suspension is a read-only freeze (docs/DECISIONS.md). Looking is always
  // allowed — an owner locked out of their own records cannot see what caused
  // the suspension — but nothing may change while the gym is frozen.
  describe.each<GymStatus>(['suspended', 'pending_approval'])(
    'on a gym that is %s',
    (status) => {
      beforeEach(() => {
        found = { status };
      });

      it.each(['GET', 'HEAD', 'OPTIONS'])('allows %s', async (method) => {
        await expect(
          guard.canActivate(buildContext(method, { gymId: GYM_ID })),
        ).resolves.toBe(true);
      });

      it.each(['POST', 'PATCH', 'PUT', 'DELETE'])(
        'rejects %s with 403',
        async (method) => {
          await expect(
            guard.canActivate(buildContext(method, { gymId: GYM_ID })),
          ).rejects.toThrow(ForbiddenException);
        },
      );

      it('names suspension as the reason, not authorization', async () => {
        await expect(
          guard.canActivate(buildContext('POST', { gymId: GYM_ID })),
        ).rejects.toThrow('Gym is suspended');
      });
    },
  );

  // The guard keys on the route param, which is exactly the gym-scoped surface.
  // A user-scoped mutation (PATCH /api/me, marking a notification read) carries
  // no :gymId, and one gym's suspension must not freeze a person's own profile.
  describe('on a route with no :gymId param', () => {
    it('allows a mutation without consulting the database', async () => {
      await expect(
        guard.canActivate(buildContext('PATCH', {})),
      ).resolves.toBe(true);
      expect(findOne).not.toHaveBeenCalled();
    });
  });

  // Turning a missing gym into a 403 would leak the difference between "no such
  // gym" and "a gym you may not touch", and would change the status code the
  // handler already returns for this case.
  describe('on a gymId that does not exist', () => {
    it('passes the request through so the handler can 404', async () => {
      found = null;

      await expect(
        guard.canActivate(buildContext('POST', { gymId: 'nope' })),
      ).resolves.toBe(true);
    });
  });

  it('looks the gym up by its route id', async () => {
    await guard.canActivate(buildContext('POST', { gymId: GYM_ID }));

    expect(findOne).toHaveBeenCalledWith({
      where: { id: GYM_ID },
      select: { id: true, status: true },
    });
  });
});
