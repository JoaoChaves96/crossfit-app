/**
 * Jest E2E global setup file.
 *
 * Runs before each test file. Sets environment variables required for
 * real JWT verification so tests do not rely on the dev bypass in
 * JwtAuthGuard (which only fires when NODE_ENV === 'development').
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
