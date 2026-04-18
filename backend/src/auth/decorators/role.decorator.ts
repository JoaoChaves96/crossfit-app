import { SetMetadata } from '@nestjs/common';

export const ROLE_KEY = 'required_role';

/**
 * Decorator to specify required role for an endpoint.
 * Roles: 'owner', 'coach', 'athlete'
 */
export const Role = (role: 'owner' | 'coach' | 'athlete') =>
  SetMetadata(ROLE_KEY, role);
