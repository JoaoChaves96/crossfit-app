import * as jwt from 'jsonwebtoken';

const TEST_JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';

export interface TestTokenPayload {
  id: string;
  email: string;
  gymId: string;
  role: string;
}

/**
 * Generates a signed JWT for use in E2E tests.
 *
 * Uses the same JWT_SECRET the app reads (process.env.JWT_SECRET),
 * falling back to 'test-secret' when not set. The token expires in 1 hour.
 *
 * The payload shape matches what JwtAuthGuard expects:
 *   sub  → request.user.id
 *   email → request.user.email
 *   gymId → request.user.gymId
 *   role  → request.user.role
 */
export function generateTestToken(payload: TestTokenPayload): string {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      gymId: payload.gymId,
      role: payload.role,
    },
    TEST_JWT_SECRET,
    { expiresIn: '1h' },
  );
}
