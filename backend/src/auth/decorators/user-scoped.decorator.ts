import { SetMetadata } from '@nestjs/common';

export const USER_SCOPED_KEY = 'user_scoped';

/**
 * Marks an endpoint as user-scoped (does not require gymId from route params).
 * User-scoped endpoints:
 * - Take the acting user from the verified JWT, like every other endpoint
 * - Return data across all gyms the user belongs to, not one gym's slice
 *
 * Contrast with gym-scoped endpoints:
 * - Require gymId in route params
 * - Require gym-level authorization (owner, coach, membership)
 */
export const UserScoped = () => SetMetadata(USER_SCOPED_KEY, true);
