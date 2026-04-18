/**
 * Authentication & Authorization
 *
 * This module contains:
 * - Guards: JWT validation, role-based access control
 * - Decorators: Extract user context, gym context, roles
 * - Services: User authentication, token generation (future)
 *
 * In MVP: Minimal implementation with stubs for future JWT support
 */

export { JwtAuthGuard } from './guards/jwt-auth.guard';
export { CurrentUser } from './decorators/current-user.decorator';
export { CurrentGym } from './decorators/current-gym.decorator';
