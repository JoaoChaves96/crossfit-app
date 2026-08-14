import * as jwt from 'jsonwebtoken';
import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';

const TEST_SECRET = 'test-jwt-secret';

function buildContext(headers: Record<string, string | undefined>): {
  context: ExecutionContext;
  request: Record<string, unknown>;
} {
  const request: Record<string, unknown> = { headers };
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: TEST_SECRET, NODE_ENV: 'test' };
    guard = new JwtAuthGuard();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('with a valid JWT token in Authorization header', () => {
    it('returns true and sets user on request', () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'user@example.com', gymId: 'gym-1', role: 'owner' },
        TEST_SECRET,
        { expiresIn: '1h' },
      );
      const { context, request } = buildContext({ authorization: `Bearer ${token}` });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      const user = request.user as Record<string, string>;
      expect(user.id).toBe('user-1');
      expect(user.email).toBe('user@example.com');
      expect(user.gymId).toBe('gym-1');
      expect(user.role).toBe('owner');
    });
  });

  describe('with an expired JWT token', () => {
    it('throws UnauthorizedException', () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'user@example.com', gymId: 'gym-1', role: 'owner' },
        TEST_SECRET,
        { expiresIn: -1 },
      );
      const { context } = buildContext({ authorization: `Bearer ${token}` });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('with a missing Authorization header', () => {
    it('throws UnauthorizedException', () => {
      const { context } = buildContext({});

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('with a malformed token (invalid signature)', () => {
    it('throws UnauthorizedException', () => {
      const { context } = buildContext({ authorization: 'Bearer this.is.notvalid' });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('with a malformed Authorization header format (no Bearer prefix)', () => {
    it('throws UnauthorizedException', () => {
      const token = jwt.sign({ sub: 'user-1' }, TEST_SECRET);
      const { context } = buildContext({ authorization: token });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('with a token signed by a different secret', () => {
    it('throws UnauthorizedException', () => {
      const token = jwt.sign(
        { sub: 'user-1', email: 'user@example.com', gymId: 'gym-1', role: 'owner' },
        'wrong-secret',
        { expiresIn: '1h' },
      );
      const { context } = buildContext({ authorization: `Bearer ${token}` });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  describe('when JWT_SECRET is not configured', () => {
    it('throws UnauthorizedException', () => {
      delete process.env.JWT_SECRET;
      const token = jwt.sign({ sub: 'user-1' }, TEST_SECRET);
      const { context } = buildContext({ authorization: `Bearer ${token}` });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });

  // There is no environment in which identity may come from a request header.
  // A `development` bypass used to live here: with no Authorization header it
  // built `req.user` straight from `x-user-id` / `x-gym-id`, so the caller chose
  // who they were and which gym they were in, and every downstream identity and
  // tenant check ran on attacker-supplied values. Mint a real token instead —
  // `scripts/dev-token.sh <email>` wraps the same POST /api/auth/login the app
  // uses. These tests exist to keep the branch from coming back.
  describe('with headers instead of a token', () => {
    it('throws even under NODE_ENV=development', () => {
      process.env.NODE_ENV = 'development';
      const { context, request } = buildContext({
        'x-user-id': 'dev-user',
        'x-gym-id': 'dev-gym',
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
      expect(request.user).toBeUndefined();
    });

    it('ignores x-user-id when a valid token is present', () => {
      const token = jwt.sign(
        { sub: 'real-user', email: 'real@example.com', gymId: 'real-gym', role: 'athlete' },
        TEST_SECRET,
        { expiresIn: '1h' },
      );
      const { context, request } = buildContext({
        authorization: `Bearer ${token}`,
        'x-user-id': 'impersonated-user',
        'x-gym-id': 'impersonated-gym',
      });

      expect(guard.canActivate(context)).toBe(true);
      const user = request.user as Record<string, string>;
      expect(user.id).toBe('real-user');
      expect(user.gymId).toBe('real-gym');
    });
  });
});
