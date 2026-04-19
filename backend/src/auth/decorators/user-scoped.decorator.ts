import { SetMetadata } from '@nestjs/common';

export const USER_SCOPED_KEY = 'user_scoped';

/**
 * Marks an endpoint as user-scoped (does not require gymId from route params).
 * User-scoped endpoints:
 * - Require x-user-id header (authentication)
 * - Accept optional x-gym-id header (filtering)
 * - Return data across all gyms unless x-gym-id filters it
 *
 * Contrast with gym-scoped endpoints:
 * - Require gymId in route params
 * - Require gym-level authorization (owner, coach, membership)
 */
export const UserScoped = () => SetMetadata(USER_SCOPED_KEY, true);
